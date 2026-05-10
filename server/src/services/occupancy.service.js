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
 * Calculate occupied slots for MULTIPLE parkings for a SPECIFIC time range.
 *
 * Single aggregation — more efficient than calling calculateOccupiedSlots per parking.
 * Used by search/nearby list pages when date+startTime+endTime filters are active.
 *
 * @param {Array<{id: string, totalSlots: number}>} parkings
 * @param {object} timeRange - { bookingDate, startTime, endTime }
 * @param {string} timeRange.bookingDate - "YYYY-MM-DD"
 * @param {string} timeRange.startTime  - "HH:mm"
 * @param {string} timeRange.endTime    - "HH:mm"
 * @param {object} deps
 * @returns {Promise<Map<string, number>>} parkingId (string) → occupiedSlots
 */
export async function calculateOccupiedSlotsForMany(parkings, timeRange, deps = {}) {
  if (parkings.length === 0) return new Map();

  const BookingModel = deps.BookingModel ?? Booking;
  const parkingIds = parkings.map((p) => p.id);

  const results = await BookingModel.aggregate([
    {
      $match: {
        parking: { $in: parkingIds },
        bookingDate: timeRange.bookingDate,
        status: { $in: VALID_OCCUPANCY_STATUSES },
        ...VALID_BOOKING_FILTERS,
        // Overlap: booking.start < request.end AND booking.end > request.start
        startTime: { $lt: timeRange.endTime },
        endTime: { $gt: timeRange.startTime }
      }
    },
    {
      $group: {
        _id: '$parking',
        occupiedSlots: { $sum: '$slotCount' }
      }
    }
  ]);

  return new Map(results.map((r) => [r._id.toString(), r.occupiedSlots]));
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
 * Calculate RESERVED slots for a listing (ALL confirmed bookings).
 * 
 * BUSINESS RULE: This counts ALL active confirmed bookings (current + future),
 * not just physically occupied slots at this moment.
 * 
 * This is the PRIMARY metric for UI availability display.
 * 
 * Counts bookings where:
 * - status: confirmed/active/ongoing
 * - paymentStatus: paid
 * - bookingStatus: not cancelled
 * - bookingDate >= TODAY (excludes past bookings)
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<number>} - Total reserved slots (current + future)
 */
export async function calculateReservedSlots(listingId, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const now = deps.now ?? new Date();

  const { date: todayStr } = getKolkataNowParts(now);

  const filter = {
    parking: listingId,
    status: { $in: VALID_OCCUPANCY_STATUSES },
    ...VALID_BOOKING_FILTERS,
    // Include today and future bookings only (exclude past)
    bookingDate: { $gte: todayStr }
  };

  const result = await BookingModel.aggregate([
    { $match: filter },
    { $group: { _id: null, totalSlots: { $sum: '$slotCount' } } }
  ]);

  return result[0]?.totalSlots ?? 0;
}

/**
 * Calculate RESERVED slots for MULTIPLE parkings (batch operation).
 * 
 * More efficient than calling calculateReservedSlots for each parking.
 * Used by dashboards and listing pages.
 * 
 * @param {Array<{id: string, totalSlots: number}>} parkings
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<Map<string, number>>} parkingId (string) → reservedSlots
 */
export async function calculateReservedSlotsForMany(parkings, deps = {}) {
  if (parkings.length === 0) return new Map();

  const BookingModel = deps.BookingModel ?? Booking;
  const now = deps.now ?? new Date();
  const { date: todayStr } = getKolkataNowParts(now);

  const parkingIds = parkings.map((p) => p.id);

  const results = await BookingModel.aggregate([
    {
      $match: {
        parking: { $in: parkingIds },
        status: { $in: VALID_OCCUPANCY_STATUSES },
        ...VALID_BOOKING_FILTERS,
        bookingDate: { $gte: todayStr }
      }
    },
    {
      $group: {
        _id: '$parking',
        reservedSlots: { $sum: '$slotCount' }
      }
    }
  ]);

  return new Map(results.map((r) => [r._id.toString(), r.reservedSlots]));
}

/**
 * Calculate current occupancy for a listing (NOW).
 * 
 * Counts bookings where:
 * - booking.start <= NOW
 * - booking.end > NOW
 * - valid status
 * 
 * NOTE: This is for real-time monitoring only. For UI availability display,
 * use calculateReservedSlots() instead.
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
 * Calculate comprehensive RESERVATION metrics for a listing.
 * 
 * BUSINESS RULE: Uses RESERVED SLOTS (all confirmed bookings) as primary metric,
 * not just current moment occupancy.
 * 
 * Returns all occupancy data needed for dashboards and analytics.
 * 
 * @param {string|ObjectId} listingId - Parking listing ID
 * @param {number} totalSlots - Total slots in the listing
 * @param {object} deps - Dependencies for testing
 * @returns {Promise<object>} - Complete occupancy metrics
 */
export async function calculateOccupancyMetrics(listingId, totalSlots, deps = {}) {
  const [reservedSlots, currentOccupied, upcomingLoad] = await Promise.all([
    calculateReservedSlots(listingId, deps),
    calculateCurrentOccupancy(listingId, deps),
    calculateUpcomingLoad(listingId, deps)
  ]);

  // PRIMARY METRIC: Available = Total - Reserved (all confirmed bookings)
  const availableSlots = Math.max(0, totalSlots - reservedSlots);
  const utilization = calculateUtilization(reservedSlots, totalSlots);

  return {
    totalSlots,
    reservedSlots,           // NEW: All confirmed bookings (current + future)
    occupiedSlots: currentOccupied,  // Current moment only (for monitoring)
    availableSlots,          // Based on reserved, not occupied
    utilization,             // Based on reserved, not occupied
    upcomingReservations: upcomingLoad.count,
    upcomingReservedSlots: upcomingLoad.slots
  };
}

/**
 * Calculate RESERVATION metrics for multiple listings (batch operation).
 * 
 * BUSINESS RULE: Uses RESERVED SLOTS (all confirmed bookings) as primary metric.
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

  // Get RESERVED slots (all confirmed bookings today and future)
  const reservedResults = await BookingModel.aggregate([
    {
      $match: {
        parking: { $in: listingIds },
        status: { $in: VALID_OCCUPANCY_STATUSES },
        ...VALID_BOOKING_FILTERS,
        bookingDate: { $gte: todayStr }
      }
    },
    {
      $group: {
        _id: '$parking',
        reservedSlots: { $sum: '$slotCount' },
        bookingCount: { $sum: 1 }
      }
    }
  ]);

  // Get current occupancy for all listings (for monitoring)
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
  const reservedMap = new Map(
    reservedResults.map((r) => [r._id.toString(), { reservedSlots: r.reservedSlots, bookingCount: r.bookingCount }])
  );

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
    const reserved = reservedMap.get(listingId) ?? { reservedSlots: 0, bookingCount: 0 };
    const reservedSlots = reserved.reservedSlots;
    const occupiedSlots = currentOccupancyMap.get(listingId) ?? 0;
    const upcoming = upcomingMap.get(listingId) ?? { count: 0, slots: 0 };

    // PRIMARY METRIC: Available = Total - Reserved
    const availableSlots = Math.max(0, totalSlots - reservedSlots);
    const utilization = calculateUtilization(reservedSlots, totalSlots);

    result.set(listingId, {
      totalSlots,
      reservedSlots,           // NEW: All confirmed bookings
      occupiedSlots,           // Current moment only
      availableSlots,          // Based on reserved
      utilization,             // Based on reserved
      upcomingReservations: upcoming.count,
      upcomingReservedSlots: upcoming.slots,
      bookingCount: reserved.bookingCount  // Total booking count
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
