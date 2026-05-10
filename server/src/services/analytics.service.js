import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';
import {
  calculateOccupancyMetricsForMany
} from './occupancy.service.js';

// STRICT BUSINESS RULES FOR OWNER ANALYTICS
const COMPLETED_BOOKING_STATUS = 'completed';
const CONFIRMED_STATUSES = ['confirmed', 'active', 'ongoing'];
const CANCELLED_STATUS = 'cancelled';
const FAILED_STATUSES = ['payment_failed', 'expired', 'refunded'];

// Legacy constant for backward compatibility
const REVENUE_BOOKING_STATUSES = ['confirmed', 'completed'];

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
          status: { $in: ['confirmed', 'completed'] }
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
 * Owner analytics — comprehensive business insights for a parking owner.
 * 
 * STRICT BUSINESS RULES:
 * - Revenue: ONLY completed successful bookings
 * - Confirmed: confirmed/active/ongoing bookings
 * - Cancelled: cancelled bookings (excluded from revenue)
 * - Peak hours: ONLY successful bookings (exclude cancelled)
 * - Trends: Separate lines for confirmed/completed/cancelled
 * 
 * @param {import('mongoose').Types.ObjectId} ownerId
 * @param {object} options - Filter options (dateRange, parkingId)
 */
export async function getOwnerAnalytics(ownerId, options = {}) {
  const ownerParkings = await Parking.find({ owner: ownerId }).lean();
  const parkingIds = ownerParkings.map((p) => p._id);

  if (parkingIds.length === 0) {
    return getEmptyOwnerAnalytics();
  }

  // Apply filters
  const baseMatch = { parking: { $in: parkingIds } };
  
  // Date range filter
  if (options.startDate && options.endDate) {
    baseMatch.bookingDate = { $gte: options.startDate, $lte: options.endDate };
  } else {
    // Default: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);
    baseMatch.bookingDate = { $gte: dateStr };
  }

  // Parking filter
  if (options.parkingId) {
    baseMatch.parking = options.parkingId;
  }

  // Run all analytics queries in parallel
  const [
    revenueStats,
    bookingStatusCounts,
    revenueTrend,
    bookingsTrend,
    peakHours,
    listingPerformance,
    customerInsights,
    recentActivity
  ] = await Promise.all([
    calculateRevenueStats(baseMatch),
    calculateBookingStatusCounts(baseMatch),
    calculateRevenueTrend(baseMatch),
    calculateBookingsTrend(baseMatch),
    calculatePeakHours(baseMatch),
    calculateListingPerformance(parkingIds, baseMatch),
    calculateCustomerInsights(baseMatch),
    getRecentActivity(parkingIds, 10)
  ]);

  // Get occupancy stats
  const occupancyMetricsMap = await calculateOccupancyMetricsForMany(
    ownerParkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots }))
  );

  const totalSlots = ownerParkings.reduce((sum, p) => sum + (p.totalSlots ?? 0), 0);
  const reservedSlots = Array.from(occupancyMetricsMap.values())
    .reduce((sum, m) => sum + (m.reservedSlots ?? 0), 0);

  // Calculate KPIs
  const totalRevenue = revenueStats.totalRevenue;
  const completedBookings = bookingStatusCounts.completed;
  const confirmedBookings = bookingStatusCounts.confirmed;
  const cancelledBookings = bookingStatusCounts.cancelled;
  const activeReservations = reservedSlots;
  const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
  const occupancyRate = totalSlots > 0 ? (reservedSlots / totalSlots) * 100 : 0;

  return {
    // KPI Summary
    kpis: {
      totalRevenue,
      activeReservations,
      completedBookings,
      cancelledBookings,
      confirmedBookings,
      averageBookingValue,
      occupancyRate
    },
    
    // Revenue trend (completed bookings only)
    revenueTrend,
    
    // Bookings trend (confirmed, completed, cancelled)
    bookingsTrend,
    
    // Peak hours (exclude cancelled)
    peakHours,
    
    // Listing performance
    listingPerformance,
    
    // Customer insights
    customerInsights,
    
    // Recent activity
    recentActivity,
    
    // Occupancy stats
    occupancyStats: {
      totalSlots,
      reservedSlots,
      availableSlots: Math.max(0, totalSlots - reservedSlots),
      occupancyRate
    }
  };
}

/**
 * Calculate revenue statistics (completed bookings only)
 */
async function calculateRevenueStats(baseMatch) {
  const revenueMatch = {
    ...baseMatch,
    status: COMPLETED_BOOKING_STATUS,
    paymentStatus: 'paid',
    bookingStatus: { $ne: 'cancelled' }
  };

  const result = await Booking.aggregate([
    { $match: revenueMatch },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalRevenue: result[0]?.totalRevenue ?? 0,
    count: result[0]?.count ?? 0
  };
}

/**
 * Calculate booking counts by status
 */
async function calculateBookingStatusCounts(baseMatch) {
  const statusCounts = await Booking.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const counts = {
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    failed: 0
  };

  statusCounts.forEach(item => {
    if (CONFIRMED_STATUSES.includes(item._id)) {
      counts.confirmed += item.count;
    } else if (item._id === COMPLETED_BOOKING_STATUS) {
      counts.completed = item.count;
    } else if (item._id === CANCELLED_STATUS) {
      counts.cancelled = item.count;
    } else if (item._id === 'pending') {
      counts.pending = item.count;
    } else if (FAILED_STATUSES.includes(item._id)) {
      counts.failed += item.count;
    }
  });

  return counts;
}

/**
 * Calculate revenue trend over time (completed bookings only)
 */
async function calculateRevenueTrend(baseMatch) {
  const revenueMatch = {
    ...baseMatch,
    status: COMPLETED_BOOKING_STATUS,
    paymentStatus: 'paid',
    bookingStatus: { $ne: 'cancelled' }
  };

  const trend = await Booking.aggregate([
    { $match: revenueMatch },
    {
      $group: {
        _id: '$bookingDate',
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 90 }
  ]);

  return trend.map(item => ({
    date: item._id,
    revenue: item.revenue,
    bookings: item.bookings
  }));
}

/**
 * Calculate bookings trend by status (confirmed, completed, cancelled)
 */
async function calculateBookingsTrend(baseMatch) {
  const trend = await Booking.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: {
          date: '$bookingDate',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  // Group by date
  const trendByDate = {};
  trend.forEach(item => {
    const date = item._id.date;
    if (!trendByDate[date]) {
      trendByDate[date] = { date, confirmed: 0, completed: 0, cancelled: 0 };
    }
    
    if (CONFIRMED_STATUSES.includes(item._id.status)) {
      trendByDate[date].confirmed += item.count;
    } else if (item._id.status === COMPLETED_BOOKING_STATUS) {
      trendByDate[date].completed = item.count;
    } else if (item._id.status === CANCELLED_STATUS) {
      trendByDate[date].cancelled = item.count;
    }
  });

  return Object.values(trendByDate).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate peak booking hours (exclude cancelled)
 */
async function calculatePeakHours(baseMatch) {
  const peakHoursMatch = {
    ...baseMatch,
    status: { $ne: CANCELLED_STATUS }  // Exclude cancelled bookings
  };

  const peakHours = await Booking.aggregate([
    { $match: peakHoursMatch },
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
    { $limit: 10 }
  ]);

  return peakHours.map(item => ({
    hour: item._id,
    bookings: item.count
  }));
}

/**
 * Calculate performance metrics per listing
 */
async function calculateListingPerformance(parkingIds, baseMatch) {
  const performance = await Booking.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: {
          parking: '$parking',
          status: '$status'
        },
        count: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', COMPLETED_BOOKING_STATUS] },
                  { $eq: ['$paymentStatus', 'paid'] },
                  { $ne: ['$bookingStatus', 'cancelled'] }
                ]
              },
              '$totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  // Group by parking
  const performanceByParking = {};
  performance.forEach(item => {
    const parkingId = item._id.parking.toString();
    if (!performanceByParking[parkingId]) {
      performanceByParking[parkingId] = {
        parkingId,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        revenue: 0
      };
    }
    
    performanceByParking[parkingId].totalBookings += item.count;
    performanceByParking[parkingId].revenue += item.revenue;
    
    if (item._id.status === COMPLETED_BOOKING_STATUS) {
      performanceByParking[parkingId].completedBookings = item.count;
    } else if (item._id.status === CANCELLED_STATUS) {
      performanceByParking[parkingId].cancelledBookings = item.count;
    }
  });

  // Get parking details
  const parkings = await Parking.find({ _id: { $in: parkingIds } })
    .select('title totalSlots')
    .lean();

  const parkingMap = new Map(parkings.map(p => [p._id.toString(), p]));

  return Object.values(performanceByParking).map(perf => {
    const parking = parkingMap.get(perf.parkingId);
    return {
      ...perf,
      parkingName: parking?.title ?? 'Unknown',
      totalSlots: parking?.totalSlots ?? 0,
      cancellationRate: perf.totalBookings > 0 
        ? ((perf.cancelledBookings / perf.totalBookings) * 100).toFixed(1)
        : 0
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Calculate customer insights
 */
async function calculateCustomerInsights(baseMatch) {
  const validBookingsMatch = {
    ...baseMatch,
    status: { $ne: CANCELLED_STATUS }
  };

  const [uniqueCustomers, repeatCustomers, bookingStats] = await Promise.all([
    Booking.distinct('user', validBookingsMatch).then(users => users.length),
    
    Booking.aggregate([
      { $match: validBookingsMatch },
      {
        $group: {
          _id: '$user',
          bookingCount: { $sum: 1 }
        }
      },
      { $match: { bookingCount: { $gt: 1 } } },
      { $count: 'repeatCustomers' }
    ]).then(result => result[0]?.repeatCustomers ?? 0),
    
    Booking.aggregate([
      { $match: validBookingsMatch },
      {
        $group: {
          _id: null,
          avgSlots: { $avg: '$slotCount' },
          avgDuration: {
            $avg: {
              $subtract: [
                { $toDate: { $concat: ['2000-01-01T', '$endTime', ':00'] } },
                { $toDate: { $concat: ['2000-01-01T', '$startTime', ':00'] } }
              ]
            }
          }
        }
      }
    ])
  ]);

  const avgDurationMs = bookingStats[0]?.avgDuration ?? 0;
  const avgDurationHours = avgDurationMs / (1000 * 60 * 60);

  return {
    uniqueCustomers,
    repeatCustomers,
    averageSlotsPerBooking: bookingStats[0]?.avgSlots?.toFixed(1) ?? 0,
    averageBookingDuration: avgDurationHours.toFixed(1)
  };
}

/**
 * Get recent activity (last N bookings)
 */
async function getRecentActivity(parkingIds, limit = 10) {
  const recentBookings = await Booking.find({ parking: { $in: parkingIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name')
    .populate('parking', 'title')
    .lean();

  return recentBookings.map(booking => ({
    id: booking._id.toString(),
    type: booking.status === COMPLETED_BOOKING_STATUS ? 'completed' 
        : booking.status === CANCELLED_STATUS ? 'cancelled' 
        : 'new',
    customerName: booking.user?.name ?? 'Unknown',
    parkingName: booking.parking?.title ?? 'Unknown',
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    amount: booking.totalAmount,
    status: booking.status,
    createdAt: booking.createdAt
  }));
}

/**
 * Return empty analytics structure
 */
function getEmptyOwnerAnalytics() {
  return {
    kpis: {
      totalRevenue: 0,
      activeReservations: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      confirmedBookings: 0,
      averageBookingValue: 0,
      occupancyRate: 0
    },
    revenueTrend: [],
    bookingsTrend: [],
    peakHours: [],
    listingPerformance: [],
    customerInsights: {
      uniqueCustomers: 0,
      repeatCustomers: 0,
      averageSlotsPerBooking: 0,
      averageBookingDuration: 0
    },
    recentActivity: [],
    occupancyStats: {
      totalSlots: 0,
      reservedSlots: 0,
      availableSlots: 0,
      occupancyRate: 0
    }
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

  // Build occupancy by listing using RESERVED CAPACITY
  const occupancyByListing = ownerParkings.map((parking) => {
    const metrics = occupancyMetricsMap.get(parking._id.toString()) ?? {
      totalSlots: parking.totalSlots,
      reservedSlots: 0,
      occupiedSlots: 0,
      availableSlots: parking.totalSlots,
      utilization: 0,
      upcomingReservations: 0,
      upcomingReservedSlots: 0
    };

    return {
      parking: parking._id.toString(),
      reservedSlots: metrics.reservedSlots,           // All confirmed bookings
      activeOccupiedSlots: metrics.occupiedSlots,     // Current moment only
      upcomingReservedSlots: metrics.upcomingReservedSlots,
      upcomingReservations: metrics.upcomingReservations
    };
  });

  // Aggregate totals based on RESERVED CAPACITY
  const totalSlots = ownerParkings.reduce((sum, parking) => sum + (parking.totalSlots ?? 0), 0);
  const reservedSlots = occupancyByListing.reduce((sum, item) => sum + item.reservedSlots, 0);
  const activeOccupiedSlots = occupancyByListing.reduce((sum, item) => sum + item.activeOccupiedSlots, 0);
  const upcomingReservedSlots = occupancyByListing.reduce((sum, item) => sum + item.upcomingReservedSlots, 0);
  const upcomingReservations = occupancyByListing.reduce((sum, item) => sum + item.upcomingReservations, 0);

  const occupancyStats = {
    totalSlots,
    reservedSlots,                                    // PRIMARY METRIC: All confirmed bookings
    activeOccupiedSlots,                              // Current moment only
    upcomingReservedSlots,
    upcomingReservations,
    occupiedSlotsNow: reservedSlots,                  // For dashboard display
    availableSlotsNow: Math.max(0, totalSlots - reservedSlots),  // Based on reserved
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
