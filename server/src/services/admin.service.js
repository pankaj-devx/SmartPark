import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';
import { calculateOccupancyMetricsForMany } from './occupancy.service.js';
import { serializeParking, approveParking, rejectParking, toggleParkingActive } from './parking.service.js';
import { createHttpError } from '../utils/createHttpError.js';

export async function getAdminDashboard(deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const BookingModel = deps.BookingModel ?? Booking;
  const UserModel = deps.UserModel ?? User;

  const [pendingApprovals, approvedListings, rejectedListings, totalBookings, totalUsers, parkings, users] =
    await Promise.all([
      ParkingModel.countDocuments({ verificationStatus: 'pending' }),
      ParkingModel.countDocuments({ verificationStatus: 'approved' }),
      ParkingModel.countDocuments({ verificationStatus: 'rejected' }),
      BookingModel.countDocuments({}),
      UserModel.countDocuments({}),
      buildAdminParkingQuery(ParkingModel.find({})),
      resolveAdminUsers(UserModel)
    ]);
  const serializedParkings = await serializeParkingsWithLiveSlots(parkings, deps);

  return {
    summary: {
      pendingApprovals,
      approvedListings,
      rejectedListings,
      totalBookings,
      totalUsers,
      inactiveListings: serializedParkings.filter((parking) => !parking.isActive).length
    },
    parkings: groupParkingsByStatus(serializedParkings),
    users,
    userMetrics: {
      drivers: users.filter((user) => user.role === 'driver').length,
      owners: users.filter((user) => user.role === 'owner').length,
      admins: users.filter((user) => user.role === 'admin').length,
      suspended: users.filter((user) => user.status === 'suspended').length
    }
  };
}

export async function listAdminParkings(deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const BookingModel = deps.BookingModel ?? Booking;
  const parkings = await buildAdminParkingQuery(ParkingModel.find({}));
  const serializedParkings = await serializeParkingsWithLiveSlots(parkings, deps);
  const bookingCounts = await getBookingCountsByParking(BookingModel, parkings);

  const listings = serializedParkings.map((parking) => ({
    ...parking,
    bookingCount: bookingCounts.get(parking.id) ?? 0,
    parkingStatus: getParkingStatus(parking)
  }));

  return {
    ...groupParkingsByStatus(listings),
    all: listings
  };
}

export async function approveAdminParking(id, deps = {}) {
  return approveParking(id, deps);
}

export async function rejectAdminParking(id, reason, deps = {}) {
  return rejectParking(id, reason, deps);
}

export async function toggleAdminParkingActive(id, deps = {}) {
  return toggleParkingActive(id, deps);
}

export async function listAdminBookings(query = {}, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.parking) {
    filter.parking = query.parking;
  }

  if (query.user) {
    filter.user = query.user;
  }

  let bookingsQuery = BookingModel.find(filter);

  if (typeof bookingsQuery.populate === 'function') {
    bookingsQuery = bookingsQuery
      .populate('user', 'name email role')
      .populate('parking', 'title city state');
  }

  const bookings = await bookingsQuery.sort({ createdAt: -1, _id: 1 }).lean();

  return bookings.map(serializeAdminBooking);
}

/**
 * Serialize an array of raw parking documents and inject live available slot
 * counts from a single batched aggregation. Used by admin endpoints that need
 * accurate slot data across all listings.
 */
async function serializeParkingsWithLiveSlots(parkings, deps = {}) {
  // Use dynamic occupancy (live confirmed booking counts) instead of the stale
  // parking.availableSlots DB field so admin sees consistent data across all views.
  const occupancyMetrics = await calculateOccupancyMetricsForMany(
    parkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    deps
  );

  return parkings.map((p) => {
    const serialized = serializeParking(p);
    const metrics = occupancyMetrics.get(p._id.toString());
    return metrics !== undefined
      ? {
          ...serialized,
          availableSlots: metrics.availableSlots,
          occupiedSlots: metrics.occupiedSlots
        }
      : serialized;
  });
}

function groupParkingsByStatus(parkings) {
  return {
    pending: parkings.filter((parking) => parking.verificationStatus === 'pending'),
    approved: parkings.filter((parking) => parking.verificationStatus === 'approved'),
    rejected: parkings.filter((parking) => parking.verificationStatus === 'rejected')
  };
}

async function resolveAdminUsers(UserModel) {
  if (typeof UserModel.find !== 'function') {
    return [];
  }

  const query = UserModel.find({});
  const users = typeof query.sort === 'function' ? await query.sort({ createdAt: -1, _id: 1 }).lean() : await query;

  return users.map(serializeAdminUser);
}

function serializeAdminUser(user) {
  return {
    id: user._id?.toString?.() ?? user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? '',
    status: user.status,
    createdAt: user.createdAt
  };
}

function serializeAdminBooking(booking) {
  return {
    id: booking._id?.toString?.() ?? booking.id,
    bookingCode: booking.bookingCode,
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.() ?? booking.user?.id,
    userName: booking.user?.name ?? '',
    userEmail: booking.user?.email ?? '',
    userRole: booking.user?.role ?? '',
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.() ?? booking.parking?.id,
    parkingTitle: booking.parking?.title ?? '',
    parkingCity: booking.parking?.city ?? '',
    parkingState: booking.parking?.state ?? '',
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    slotCount: booking.slotCount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export async function listAdminUsers(deps = {}) {
  const UserModel = deps.UserModel ?? User;
  const users = await UserModel.find({}).sort({ createdAt: -1, _id: 1 }).lean();

  return users.map(serializeAdminUser);
}

export async function blockAdminUser(id, requestingAdminId, deps = {}) {
  const UserModel = deps.UserModel ?? User;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'User not found');
  }

  if (id === requestingAdminId) {
    throw createHttpError(400, 'You cannot block your own account');
  }

  const user = await UserModel.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return serializeAdminUser(user);
}

export async function unblockAdminUser(id, deps = {}) {
  const UserModel = deps.UserModel ?? User;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'User not found');
  }

  const user = await UserModel.findByIdAndUpdate(id, { status: 'active' }, { new: true });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return serializeAdminUser(user);
}

// ---------------------------------------------------------------------------
// Parking management
// ---------------------------------------------------------------------------

export async function deleteAdminParking(id, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Parking listing not found');
  }

  const parking = await ParkingModel.findByIdAndDelete(id);

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }

  return { deleted: true, id };
}

// ---------------------------------------------------------------------------
// Booking management
// ---------------------------------------------------------------------------

export async function cancelAdminBooking(id, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const runInTransaction = deps.runInTransaction ?? withAdminTransaction;

  return runInTransaction(async (session) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(404, 'Booking not found');
    }

    const booking = await BookingModel.findById(id).session(session);

    if (!booking) {
      throw createHttpError(404, 'Booking not found');
    }

    if (booking.status === 'cancelled') {
      return serializeAdminBooking(booking);
    }

    if (booking.status === 'completed') {
      throw createHttpError(400, `Cannot cancel a booking that is already ${booking.status}`);
    }

    if (booking.status !== 'cancelled') {
      booking.status = 'cancelled';
      booking.cancelledBy = 'admin';
      await booking.save({ session });
      // Note: Availability is computed dynamically from live booking data.
      // Cancelled bookings are automatically excluded from occupancy calculations.
    }

    console.log('Booking Cancelled by Admin');
    
    // Recalculate RESERVED SLOTS after admin cancellation to emit accurate counts
    const parking = await ParkingModel.findById(booking.parking).session(session);
    if (parking) {
      const { calculateReservedSlots } = await import('./occupancy.service.js');
      const { getIO } = await import('../config/socket.js');
      const reservedSlots = await calculateReservedSlots(parking._id, { BookingModel });
      
      // Emit real-time event to notify admin dashboard and owner about slot update
      const io = getIO();
      if (io) {
        const eventData = {
          parkingId: parking._id.toString(),
          action: 'cancelled',
          bookingId: booking._id.toString(),
          totalSlots: parking.totalSlots,
          reservedSlots,
          occupiedSlots: reservedSlots,  // For UI consistency
          availableSlots: Math.max(0, parking.totalSlots - reservedSlots)
        };
        console.log('[AdminService] Emitting parking_slots_updated event (admin cancellation):', eventData);
        io.emit('parking_slots_updated', eventData);
      } else {
        console.warn('[AdminService] Socket.IO not available, cannot emit parking_slots_updated event');
      }
    }
    
    return serializeAdminBooking(booking);
  });
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function withAdminTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function getBookingCountsByParking(BookingModel, parkings) {
  if (!parkings.length || typeof BookingModel.aggregate !== 'function') {
    return new Map();
  }

  const parkingIds = parkings.map((parking) => new mongoose.Types.ObjectId(parking._id.toString()));
  const rows = await BookingModel.aggregate([
    { $match: { parking: { $in: parkingIds } } },
    { $group: { _id: '$parking', bookingCount: { $sum: 1 } } }
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row.bookingCount]));
}

function getParkingStatus(parking) {
  if (!parking.isActive) {
    return 'inactive';
  }

  return parking.verificationStatus;
}

function buildAdminParkingQuery(query) {
  const populatedQuery = typeof query.populate === 'function'
    ? query.populate('owner', 'name email role')
    : query;

  return populatedQuery.sort({ createdAt: -1, _id: 1 }).lean();
}
