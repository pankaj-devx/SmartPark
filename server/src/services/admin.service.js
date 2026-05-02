import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';
import { computeLiveAvailableSlotsForMany } from './booking.service.js';
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
      ParkingModel.find({}).sort({ createdAt: -1, _id: 1 }).lean(),
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
  const parkings = await ParkingModel.find({}).sort({ createdAt: -1, _id: 1 }).lean();
  const serializedParkings = await serializeParkingsWithLiveSlots(parkings, deps);

  return groupParkingsByStatus(serializedParkings);
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
  const liveSlots = await computeLiveAvailableSlotsForMany(
    parkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    deps
  );

  return parkings.map((p) => {
    const serialized = serializeParking(p);
    const live = liveSlots.get(p._id.toString());
    return live !== undefined ? { ...serialized, availableSlots: live } : serialized;
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
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.() ?? booking.user?.id,
    userName: booking.user?.name ?? '',
    userEmail: booking.user?.email ?? '',
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.() ?? booking.parking?.id,
    parkingTitle: booking.parking?.title ?? '',
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

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw createHttpError(400, `Cannot cancel a booking that is already ${booking.status}`);
    }

    booking.status = 'cancelled';
    booking.cancelledBy = 'admin';
    await booking.save({ session });

    await ParkingModel.findByIdAndUpdate(
      booking.parking,
      { $inc: { availableSlots: booking.slotCount } },
      { session }
    );

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
