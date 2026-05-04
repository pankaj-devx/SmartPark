import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';
import { serializeBooking } from './booking.service.js';
import { computeLiveAvailableSlotsForMany } from './booking.service.js';
import { serializeParking } from './parking.service.js';

const EARNING_STATUSES = ['confirmed', 'completed'];
const ACTIVE_STATUSES = ['pending', 'confirmed'];

export async function getOwnerBookings(user, query = {}, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const parkingIds = await getOwnerParkingIds(user, query.parking, deps);

  if (parkingIds.length === 0) {
    return {
      bookings: [],
      summary: buildOwnerSummary([], []),
      parkings: []
    };
  }

  const filter = {
    parking: { $in: parkingIds }
  };

  if (query.status) {
    filter.status = query.status;
  }

  let bookingsQuery = BookingModel.find(filter);

  // Populate user and parking details for owner dashboard
  if (typeof bookingsQuery.populate === 'function') {
    bookingsQuery = bookingsQuery
      .populate('user', 'name email phone role')
      .populate('parking', 'title city state address');
  }

  const [bookings, parkings] = await Promise.all([
    bookingsQuery.sort({ bookingDate: 1, startTime: 1, _id: 1 }).lean(),
    getOwnerParkings(user, deps)
  ]);

  const serializedBookings = bookings.map(serializeOwnerBooking);

  // Inject live available slot counts into owner parkings
  const liveSlots = await computeLiveAvailableSlotsForMany(
    parkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    deps
  );
  const serializedParkings = parkings.map((p) => {
    const serialized = serializeParking(p);
    const live = liveSlots.get(p._id.toString());
    return live !== undefined ? { ...serialized, availableSlots: live } : serialized;
  });

  return {
    bookings: serializedBookings,
    summary: buildOwnerSummary(serializedBookings, serializedParkings),
    parkings: serializedParkings
  };
}

export async function completeOwnerBooking(id, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const booking = await findBookingForOwner(BookingModel, ParkingModel, id, user);

  if (booking.status === 'cancelled') {
    throw createHttpError(409, 'Cancelled bookings cannot be completed');
  }

  if (booking.status === 'completed') {
    return serializeBooking(booking);
  }

  // Check whether this booking's time window has already passed.
  // If it has, reconcileExpiredBookings will have already (or will soon)
  // restore the slots — so we must NOT increment again here.
  const now = new Date();
  const endDateTime = new Date(`${booking.bookingDate}T${booking.endTime}:00`);
  const alreadyExpired = now > endDateTime;

  booking.status = 'completed';
  await booking.save();

  // Only restore slots if the booking hasn't expired yet (i.e. the owner is
  // completing it early). For expired bookings, reconcileExpiredBookings
  // handles the slot restoration to prevent double-counting.
  if (!alreadyExpired) {
    await ParkingModel.findByIdAndUpdate(booking.parking, { $inc: { availableSlots: booking.slotCount } });
    // Clamp to totalSlots
    await ParkingModel.updateOne(
      { _id: booking.parking },
      [{ $set: { availableSlots: { $min: ['$availableSlots', '$totalSlots'] } } }]
    );
  }

  return serializeBooking(booking);
}

/**
 * Verify a booking by bookingCode with role-based access control
 * - OWNER: Can only verify bookings for their own parking
 * - ADMIN: Can verify any booking
 */
export async function verifyBookingByCode(bookingCode, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;

  if (!bookingCode || typeof bookingCode !== 'string') {
    throw createHttpError(400, 'Booking code is required');
  }

  // Find booking by code and populate user and parking details
  let bookingQuery = BookingModel.findOne({ bookingCode: bookingCode.toUpperCase().trim() });

  if (typeof bookingQuery.populate === 'function') {
    bookingQuery = bookingQuery
      .populate('user', 'name email phone role')
      .populate('parking', 'title city state address owner');
  }

  const booking = await bookingQuery.lean();

  if (!booking) {
    throw createHttpError(404, 'Invalid booking code');
  }

  // Role-based access control
  if (user.role === 'owner') {
    // Owner can only verify bookings for their own parking
    const ownerId = booking.parking?.owner?.toString?.() ?? booking.parking?.owner;
    const userId = user._id.toString();

    if (ownerId !== userId) {
      throw createHttpError(403, 'You can only verify bookings for your own parking');
    }
  }
  // Admin can verify any booking (no additional check needed)

  return serializeOwnerBooking(booking);
}

async function getOwnerParkingIds(user, requestedParkingId, deps = {}) {
  const parkings = await getOwnerParkings(user, deps);
  const ids = parkings.map((parking) => parking._id.toString());

  if (!requestedParkingId) {
    return ids;
  }

  if (!mongoose.Types.ObjectId.isValid(requestedParkingId) || !ids.includes(requestedParkingId)) {
    throw createHttpError(403, 'You can only access bookings for your own parking listings');
  }

  return [requestedParkingId];
}

async function getOwnerParkings(user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  return ParkingModel.find({ owner: user._id }).sort({ createdAt: -1, _id: 1 }).lean();
}

async function findBookingForOwner(BookingModel, ParkingModel, id, user) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Booking not found');
  }

  const booking = await BookingModel.findById(id);

  if (!booking) {
    throw createHttpError(404, 'Booking not found');
  }

  const parking = await ParkingModel.findOne({ _id: booking.parking, owner: user._id });

  if (!parking) {
    throw createHttpError(403, 'You can only manage bookings for your own parking listings');
  }

  return booking;
}

function buildOwnerSummary(bookings, parkings) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const occupiedSlotsNow = bookings
    .filter(
      (booking) =>
        ACTIVE_STATUSES.includes(booking.status) &&
        booking.bookingDate === today &&
        booking.startTime <= currentTime &&
        booking.endTime > currentTime
    )
    .reduce((sum, booking) => sum + booking.slotCount, 0);
  const totalSlots = parkings.reduce((sum, parking) => sum + parking.totalSlots, 0);
  const availableSlotsNow = Math.max(0, totalSlots - occupiedSlotsNow);
  const upcomingReservations = bookings.filter(
    (booking) =>
      ACTIVE_STATUSES.includes(booking.status) &&
      (booking.bookingDate > today || (booking.bookingDate === today && booking.endTime > currentTime))
  ).length;
  const revenueBookings = bookings.filter((booking) => EARNING_STATUSES.includes(booking.status));
  const estimatedRevenue = revenueBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

  return {
    occupiedSlotsNow,
    availableSlotsNow,
    upcomingReservations,
    estimatedRevenue,
    bookingCounts: {
      total: bookings.length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
      completed: bookings.filter((booking) => booking.status === 'completed').length
    },
    perListingEarnings: parkings.map((parking) => {
      const listingBookings = revenueBookings.filter((booking) => booking.parking === parking.id);

      return {
        parking: parking.id,
        title: parking.title,
        bookings: listingBookings.length,
        estimatedRevenue: listingBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
      };
    })
  };
}

function serializeOwnerBooking(booking) {
  return {
    id: booking._id?.toString?.() ?? booking.id,
    bookingCode: booking.bookingCode,
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.() ?? booking.user?.id,
    userName: booking.user?.name ?? '',
    userEmail: booking.user?.email ?? '',
    userPhone: booking.user?.phone ?? '',
    userRole: booking.user?.role ?? '',
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.() ?? booking.parking?.id,
    parkingTitle: booking.parking?.title ?? '',
    parkingCity: booking.parking?.city ?? '',
    parkingState: booking.parking?.state ?? '',
    parkingAddress: booking.parking?.address ?? '',
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    slotCount: booking.slotCount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    paymentStatus: booking.paymentStatus ?? 'pending',
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}
