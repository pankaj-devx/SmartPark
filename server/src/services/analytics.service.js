import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';

/**
 * Driver analytics — personal usage summary for a given user.
 * @param {import('mongoose').Types.ObjectId} userId
 */
export async function getDriverAnalytics(userId) {
  const [totalBookings, totalSpentAgg, recentBookings, statusBreakdown] = await Promise.all([
    Booking.countDocuments({ user: userId }),

    Booking.aggregate([
      { $match: { user: userId } },
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
  // Collect all parking IDs that belong to this owner
  const ownerParkings = await Parking.find({ owner: ownerId }, '_id');
  const parkingIds = ownerParkings.map((p) => p._id);

  if (parkingIds.length === 0) {
    return {
      totalEarnings: 0,
      totalBookings: 0,
      bookingsPerDay: [],
      peakHours: []
    };
  }

  const matchStage = { $match: { parking: { $in: parkingIds } } };

  const [summary, bookingsPerDay, peakHours] = await Promise.all([
    Booking.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 }
        }
      }
    ]),

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
    totalEarnings: summary[0]?.totalEarnings ?? 0,
    totalBookings: summary[0]?.totalBookings ?? 0,
    bookingsPerDay,
    peakHours
  };
}

/**
 * Admin analytics — system-wide overview.
 */
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
