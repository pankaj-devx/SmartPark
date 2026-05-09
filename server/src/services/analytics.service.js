import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';
import {
  calculateOccupancyMetricsForMany
} from './occupancy.service.js';

const REVENUE_BOOKING_STATUSES = ['confirmed', 'completed'];
const KOLKATA_OFFSET_MINUTES = 330;

/**
 * Driver analytics — personal usage summary for a given user.
 * @param {import('mongoose').Types.ObjectId} userId
 */
export async function getDriverAnalytics(userId) {
  const [totalBookings, totalSpentAgg, recentBookings, statusBreakdown] = await Promise.all([
    Booking.countDocuments({ user: userId }),

    Booking.aggregate([
      { $match: { user: userId } },
      {
        $match: {
          paymentStatus: 'paid',
          bookingStatus: { $ne: 'cancelled' },
          status: { $in: REVENUE_BOOKING_STATUSES }
        }
      },
      { $group: { _id: null, totalSpent: { $sum: '$totalAmount' } } }
    ]),

    Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('parking', 'title address city'),

    Booking.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  return {
    totalBookings,
    totalSpent: totalSpentAgg[0]?.totalSpent ?? 0,
    recentBookings,
    statusBreakdown
  };
}

/**
 * Owner analytics — business insights for a parking owner.
 * Joins through the Parking model to find bookings for the owner's lots.
 * @param {import('mongoose').Types.ObjectId} ownerId
 */
export async function getOwnerAnalytics(ownerId) {
  const ownerAnalytics = await calculateOwnerAnalytics(ownerId);
  const parkingIds = ownerAnalytics.parkingIds;

  if (parkingIds.length === 0) {
    return {
      totalEarnings: 0,
      totalBookings: 0,
      totalRevenue: 0,
      revenueByListing: [],
      occupancyStats: ownerAnalytics.occupancyStats,
      bookingTrend: [],
      bookingsPerDay: [],
      peakHours: []
    };
  }

  const matchStage = { $match: { parking: { $in: parkingIds } } };

  const [bookingsPerDay, peakHours] = await Promise.all([
    // Group by bookingDate (stored as "YYYY-MM-DD" string) — this is the
    // actual parking date the customer chose, not the record creation time.
    // $ifNull falls back to createdAt-derived date for any legacy document
    // that somehow lacks bookingDate. The post-group $match drops null keys.
    Booking.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            $ifNull: [
              '$bookingDate',
              { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            ]
          },
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]),

    // Group by the hour component of startTime (stored as "HH:MM" string).
    // $ifNull falls back to "00:00" so a missing startTime doesn't produce
    // a null key. The post-group $match drops any remaining null buckets.
    Booking.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            $toInt: {
              $substr: [{ $ifNull: ['$startTime', '00:00'] }, 0, 2]
            }
          },
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
  ]);

  return {
    totalEarnings: ownerAnalytics.totalRevenue,
    totalBookings: ownerAnalytics.totalBookings,
    totalRevenue: ownerAnalytics.totalRevenue,
    revenueByListing: ownerAnalytics.revenueByListing,
    occupancyStats: ownerAnalytics.occupancyStats,
    bookingTrend: ownerAnalytics.bookingTrend,
    bookingsPerDay,
    peakHours
  };
}

/**
 * Admin analytics — system-wide overview.
 */
export async function calculateOwnerAnalytics(ownerId, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;

  const ownerParkings = await findOwnerParkingsForAnalytics(ParkingModel, ownerId);
  const parkingIds = ownerParkings.map((parking) => parking._id);

  if (parkingIds.length === 0) {
    return {
      parkingIds: [],
      totalBookings: 0,
      totalRevenue: 0,
      revenueByListing: [],
      occupancyStats: {
        totalSlots: 0,
        availableSlots: 0,
        occupiedSlots: 0,
        activeOccupiedSlots: 0,
        upcomingReservedSlots: 0,
        reservedSlots: 0,
        upcomingReservations: 0,
        reservedAvailableSlots: 0,
        occupancyByListing: []
      },
      bookingTrend: []
    };
  }

  const revenueMatch = {
    parking: { $in: parkingIds },
    paymentStatus: 'paid',
    bookingStatus: { $ne: 'cancelled' },
    status: { $in: REVENUE_BOOKING_STATUSES }
  };

  const [summary, revenueByListingRows, bookingTrend] = await Promise.all([
    BookingModel.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]),
    BookingModel.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: '$parking',
          bookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]),
    BookingModel.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: {
            $ifNull: [
              '$bookingDate',
              { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            ]
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ])
  ]);

  const revenueByListingMap = new Map(
    revenueByListingRows.map((row) => [
      row._id.toString(),
      {
        bookings: row.bookings,
        totalRevenue: row.totalRevenue
      }
    ])
  );

  const revenueByListing = ownerParkings.map((parking) => {
    const parkingId = parking._id.toString();
    const revenue = revenueByListingMap.get(parkingId) ?? { bookings: 0, totalRevenue: 0 };

    return {
      parking: parkingId,
      title: parking.title,
      bookings: revenue.bookings,
      totalRevenue: revenue.totalRevenue,
      estimatedRevenue: revenue.totalRevenue
    };
  });

  // Use centralized occupancy service for accurate metrics
  const occupancyMetricsMap = await calculateOccupancyMetricsForMany(
    ownerParkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    { BookingModel, now: deps.now }
  );

  // Build occupancy by listing
  const occupancyByListing = ownerParkings.map((parking) => {
    const metrics = occupancyMetricsMap.get(parking._id.toString()) ?? {
      totalSlots: parking.totalSlots,
      occupiedSlots: 0,
      availableSlots: parking.totalSlots,
      utilization: 0,
      upcomingReservations: 0,
      upcomingReservedSlots: 0
    };

    return {
      parking: parking._id.toString(),
      activeOccupiedSlots: metrics.occupiedSlots,
      upcomingReservedSlots: metrics.upcomingReservedSlots,
      reservedSlots: metrics.occupiedSlots + metrics.upcomingReservedSlots,
      upcomingReservations: metrics.upcomingReservations
    };
  });

  // Aggregate totals
  const totalSlots = ownerParkings.reduce((sum, parking) => sum + (parking.totalSlots ?? 0), 0);
  const activeOccupiedSlots = occupancyByListing.reduce((sum, item) => sum + item.activeOccupiedSlots, 0);
  const upcomingReservedSlots = occupancyByListing.reduce((sum, item) => sum + item.upcomingReservedSlots, 0);
  const reservedSlots = occupancyByListing.reduce((sum, item) => sum + item.reservedSlots, 0);
  const upcomingReservations = occupancyByListing.reduce((sum, item) => sum + item.upcomingReservations, 0);

  const occupancyStats = {
    totalSlots,
    activeOccupiedSlots,
    upcomingReservedSlots,
    reservedSlots,
    upcomingReservations,
    occupiedSlots: activeOccupiedSlots,
    availableSlots: Math.max(0, totalSlots - activeOccupiedSlots),
    reservedAvailableSlots: Math.max(0, totalSlots - reservedSlots),
    occupancyByListing
  };

  return {
    parkingIds,
    totalBookings: summary[0]?.totalBookings ?? 0,
    totalRevenue: summary[0]?.totalRevenue ?? 0,
    revenueByListing,
    occupancyStats,
    bookingTrend
  };
}

async function findOwnerParkingsForAnalytics(ParkingModel, ownerId) {
  const query = ParkingModel.find({ owner: ownerId });
  return findLean(query);
}

async function findLean(query) {
  if (typeof query.lean === 'function') {
    return query.lean();
  }

  if (typeof query.sort === 'function') {
    const sortedQuery = query.sort({ createdAt: -1, _id: 1 });
    if (typeof sortedQuery.lean === 'function') {
      return sortedQuery.lean();
    }
  }

  return query;
}

export async function getAdminAnalytics() {
  const [totalUsers, totalOwners, totalDrivers, totalBookings, pendingParkings, approvedParkings, rejectedParkings] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'driver' }),
      Booking.countDocuments(),
      Parking.countDocuments({ verificationStatus: 'pending' }),
      Parking.countDocuments({ verificationStatus: 'approved' }),
      Parking.countDocuments({ verificationStatus: 'rejected' })
    ]);

  return {
    totalUsers,
    totalOwners,
    totalDrivers,
    totalBookings,
    pendingParkings,
    approvedParkings,
    rejectedParkings
  };
}
