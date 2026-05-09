/**
 * SINGLE SOURCE OF TRUTH: Occupancy Calculation Engine
 * 
 * This service provides centralized occupancy logic for the entire system.
 * All availability, occupancy, and utilization calculations MUST use this service.
 * 
 * BUSINESS RULES:
 * - Valid booking statuses: confirmed, active, ongoing, paid (completed excluded from current occupancy)
 * - Time overlap: booking.start < request.end AND booking.end > request.start
 * - Available slots: max(0, totalSlots - occupiedSlots)
 * - Utilization: (occupiedSlots / totalSlots) * 100
 */

import { Booking } from '../models/booking.model.js';

const KOLKATA_OFFSET_MINUTES = 330;

/**
 * Valid booking statuses that occupy slots.
 * 
 * INCLUDE:
 * - confirmed: Paid and confirmed reservations
 * - active: Active bookings (legacy status)
 * - ongoing: Currently in progress (legacy status)
 * 
 * EXCLUDE:
 * - completed: Historical data only, does not occupy current slots
 * - cancelled: Cancelled bookings
 * - failed: Failed payment
 * - pending: Unpaid reservations (expire automatically)
 */
const VALID_OCCUPANCY_STATUSES = ['confirmed', 'active', 'ongoing'];

/**
 * Additional filters for valid bookings.
 * Must have paid status and not be cancelled.
 */
const VALID_BOOKING_FILTERS = {
  paymentStatus: 'paid',
  bookingStatus: { $ne: 'cancelled' }
};

/**
 * Calculate occupancy for a specific listing and time range.
 * 
 * This is the CORE occupancy algorithm used system-wide.
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {object} timeRange - Time range to check
 * @param {string} timeRange.bookingDate - "YYYY-MM-DD"
 * @param {string} timeRange.startTime - "HH:mm"
 * @param {string} timeRange.endTime - "HH:mm"
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<number>} - Total occupied slots during time range
 */
export async function calculateOccupiedSlots(listingId, timeRange, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;

  const filter = {
    parking: listingId,
    bookingDate: timeRange.bookingDate,
    status: { $in: VALID_OCCUPANCY_STATUSES },
    ...VALID_BOOKING_FILTERS,
    // Time overlap: (booking.start < request.end) AND (booking.end > request.start)
    startTime: { $lt: timeRange.endTime },
    endTime: { $gt: timeRange.startTime }
  };

  const result = await BookingModel.aggregate([
    { $match: filter },
    { $group: { _id: null, totalSlots: { $sum: '$slotCount' } } }
  ]);

  return result[0]?.totalSlots ?? 0;
}

/**
 * Calculate available slots for a specific listing and time range.
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {number} totalSlots - Total slots in the listing
 * @param {object} timeRange - Time range to check
 * @param {string} timeRange.bookingDate - "YYYY-MM-DD"
 * @param {string} timeRange.startTime - "HH:mm"
 * @param {string} timeRange.endTime - "HH:mm"
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<number>} - Available slots (clamped to 0)
 */
export async function calculateAvailableSlots(listingId, totalSlots, timeRange, deps = {}) {
  const occupiedSlots = await calculateOccupiedSlots(listingId, timeRange, deps);
  return Math.max(0, totalSlots - occupiedSlots);
}

/**
 * Calculate current occupancy for a listing (NOW).
 * 
 * Counts bookings where:
 * - booking.start <= NOW
 * - booking.end > NOW
 * - valid status
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<number>} - Currently occupied slots
 */
export async function calculateCurrentOccupancy(listingId, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const now = deps.now ?? new Date();

  const { date: todayStr, time: currentTime } = getKolkataNowParts(now);

  const filter = {
    parking: listingId,
    status: { $in: VALID_OCCUPANCY_STATUSES },
    ...VALID_BOOKING_FILTERS,
    $or: [
      // Started before today and ends today or later
      {
        bookingDate: { $lt: todayStr }
      },
      // Started today and is currently ongoing
      {
        bookingDate: todayStr,
        startTime: { $lte: currentTime },
        endTime: { $gt: currentTime }
      }
    ]
  };

  const result = await BookingModel.aggregate([
    { $match: filter },
    { $group: { _id: null, totalSlots: { $sum: '$slotCount' } } }
  ]);

  return result[0]?.totalSlots ?? 0;
}

/**
 * Calculate upcoming reservations for a listing.
 * 
 * Counts bookings where:
 * - booking.start > NOW
 * - valid status
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<{count: number, slots: number}>} - Upcoming reservation count and slots
 */
export async function calculateUpcomingLoad(listingId, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const now = deps.now ?? new Date();

  const { date: todayStr, time: currentTime } = getKolkataNowParts(now);

  const filter = {
    parking: listingId,
    status: { $in: VALID_OCCUPANCY_STATUSES },
    ...VALID_BOOKING_FILTERS,
    $or: [
      // Future dates
      {
        bookingDate: { $gt: todayStr }
      },
      // Today but starts in the future
      {
        bookingDate: todayStr,
        startTime: { $gt: currentTime }
      }
    ]
  };

  const result = await BookingModel.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        slots: { $sum: '$slotCount' }
      }
    }
  ]);

  return {
    count: result[0]?.count ?? 0,
    slots: result[0]?.slots ?? 0
  };
}

/**
 * Calculate utilization percentage for a listing.
 * 
 * @param {number} occupiedSlots - Currently occupied slots
 * @param {number} totalSlots - Total slots
 * @returns {number} - Utilization percentage (0-100), rounded to 2 decimals
 */
export function calculateUtilization(occupiedSlots, totalSlots) {
  if (totalSlots === 0) {
    return 0;
  }

  const utilization = (occupiedSlots / totalSlots) * 100;
  return Math.round(utilization * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate comprehensive occupancy metrics for a listing.
 * 
 * Returns all occupancy data needed for dashboards and analytics.
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {number} totalSlots - Total slots in the listing
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<object>} - Complete occupancy metrics
 */
export async function calculateOccupancyMetrics(listingId, totalSlots, deps = {}) {
  const [currentOccupied, upcomingLoad] = await Promise.all([
    calculateCurrentOccupancy(listingId, deps),
    calculateUpcomingLoad(listingId, deps)
  ]);

  const availableSlots = Math.max(0, totalSlots - currentOccupied);
  const utilization = calculateUtilization(currentOccupied, totalSlots);

  return {
    totalSlots,
    occupiedSlots: currentOccupied,
    availableSlots,
    utilization,
    upcomingReservations: upcomingLoad.count,
    upcomingReservedSlots: upcomingLoad.slots
  };
}

/**
 * Calculate occupancy metrics for multiple listings (batch operation).
 * 
 * More efficient than calling calculateOccupancyMetrics for each listing.
 * 
 * @param {Array<{id: string, totalSlots: number}>} listings - Array of listings
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<Map<string, object>>} - Map of listingId -> metrics
 */
export async function calculateOccupancyMetricsForMany(listings, deps = {}) {
  if (listings.length === 0) {
    return new Map();
  }

  const BookingModel = deps.BookingModel ?? Booking;
  const now = deps.now ?? new Date();

  const { date: todayStr, time: currentTime } = getKolkataNowParts(now);
  const listingIds = listings.map((l) => l.id);

  // Get current occupancy for all listings
  const currentOccupancyResults = await BookingModel.aggregate([
    {
      $match: {
        parking: { $in: listingIds },
        status: { $in: VALID_OCCUPANCY_STATUSES },
        ...VALID_BOOKING_FILTERS,
        $or: [
          { bookingDate: { $lt: todayStr } },
          {
            bookingDate: todayStr,
            startTime: { $lte: currentTime },
            endTime: { $gt: currentTime }
          }
        ]
      }
    },
    {
      $group: {
        _id: '$parking',
        occupiedSlots: { $sum: '$slotCount' }
      }
    }
  ]);

  // Get upcoming reservations for all listings
  const upcomingResults = await BookingModel.aggregate([
    {
      $match: {
        parking: { $in: listingIds },
        status: { $in: VALID_OCCUPANCY_STATUSES },
        ...VALID_BOOKING_FILTERS,
        $or: [
          { bookingDate: { $gt: todayStr } },
          {
            bookingDate: todayStr,
            startTime: { $gt: currentTime }
          }
        ]
      }
    },
    {
      $group: {
        _id: '$parking',
        count: { $sum: 1 },
        slots: { $sum: '$slotCount' }
      }
    }
  ]);

  // Build maps for quick lookup
  const currentOccupancyMap = new Map(
    currentOccupancyResults.map((r) => [r._id.toString(), r.occupiedSlots])
  );

  const upcomingMap = new Map(
    upcomingResults.map((r) => [
      r._id.toString(),
      { count: r.count, slots: r.slots }
    ])
  );

  // Build result map
  const result = new Map();

  for (const listing of listings) {
    const listingId = listing.id.toString();
    const totalSlots = listing.totalSlots;
    const occupiedSlots = currentOccupancyMap.get(listingId) ?? 0;
    const upcoming = upcomingMap.get(listingId) ?? { count: 0, slots: 0 };

    const availableSlots = Math.max(0, totalSlots - occupiedSlots);
    const utilization = calculateUtilization(occupiedSlots, totalSlots);

    result.set(listingId, {
      totalSlots,
      occupiedSlots,
      availableSlots,
      utilization,
      upcomingReservations: upcoming.count,
      upcomingReservedSlots: upcoming.slots
    });
  }

  return result;
}

/**
 * Build MongoDB query filter for overlapping bookings.
 * 
 * This is used by booking validation to prevent double bookings.
 * 
 * @param {object} input - Booking input
 * @param {string|ObjectId} input.parking - Parking listing ID
 * @param {string} input.bookingDate - "YYYY-MM-DD"
 * @param {string} input.startTime - "HH:mm"
 * @param {string} input.endTime - "HH:mm"
 * @returns {object} - MongoDB query filter
 */
export function buildOccupancyFilter(input) {
  return {
    parking: input.parking,
    bookingDate: input.bookingDate,
    status: { $in: VALID_OCCUPANCY_STATUSES },
    ...VALID_BOOKING_FILTERS,
    // Time overlap: (booking.start < request.end) AND (booking.end > request.start)
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime }
  };
}

/**
 * Validate if requested slots are available for a time range.
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {number} totalSlots - Total slots in the listing
 * @param {number} requestedSlots - Number of slots requested
 * @param {object} timeRange - Time range to check
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<{valid: boolean, error: string | null, availableSlots: number}>}
 */
export async function validateSlotAvailability(listingId, totalSlots, requestedSlots, timeRange, deps = {}) {
  const occupiedSlots = await calculateOccupiedSlots(listingId, timeRange, deps);
  const availableSlots = Math.max(0, totalSlots - occupiedSlots);

  if (requestedSlots < 1) {
    return {
      valid: false,
      error: 'At least one slot must be requested',
      availableSlots
    };
  }

  if (requestedSlots > availableSlots) {
    return {
      valid: false,
      error:
        availableSlots === 0
          ? 'No slots available for selected time'
          : `Only ${availableSlots} slot(s) available for selected time`,
      availableSlots
    };
  }

  return {
    valid: true,
    error: null,
    availableSlots
  };
}

/**
 * Helper: Get current Kolkata date and time parts.
 * 
 * @param {Date} now - Current date
 * @returns {{date: string, time: string}} - Date as "YYYY-MM-DD", time as "HH:mm"
 */
function getKolkataNowParts(now = new Date()) {
  const kolkataNow = new Date(now.getTime() + KOLKATA_OFFSET_MINUTES * 60 * 1000);
  return {
    date: kolkataNow.toISOString().slice(0, 10),
    time: kolkataNow.toISOString().slice(11, 16)
  };
}
