import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];

export function serializeBooking(booking) {
  return {
    id: booking._id.toString(),
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.(),
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.(),
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

export function buildBookingOverlapFilter(input) {
  return {
    parking: input.parking,
    bookingDate: input.bookingDate,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime }
  };
}

export function calculateTotalAmount(parking, input) {
  const durationMinutes = getMinutes(input.endTime) - getMinutes(input.startTime);
  const billableHours = Math.ceil(durationMinutes / 60);
  // Use vehicle-specific rate when available, fall back to hourlyPrice
  const rate = parking.pricing?.get?.(input.vehicleType) ?? parking.pricing?.[input.vehicleType] ?? parking.hourlyPrice;

  return billableHours * rate * input.slotCount;
}

export async function createBooking(input, user, deps = {}) {
  if (user.status === 'suspended') {
    throw createHttpError(403, 'Your account has been suspended. You cannot create new bookings.');
  }

  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const runInTransaction = deps.runInTransaction ?? withTransaction;

  return runInTransaction(async (session) => {
    const parking = await findBookableParking(ParkingModel, input.parking, session);

    if (!parking.vehicleTypes.includes(input.vehicleType)) {
      throw createHttpError(409, 'Vehicle type is not supported by this parking listing');
    }

    const overlappingSlots = await countOverlappingSlots(BookingModel, input, session);

    if (overlappingSlots + input.slotCount > parking.totalSlots) {
      throw createHttpError(409, 'Requested time slot is no longer available');
    }

    const updatedParking = await ParkingModel.findOneAndUpdate(
      {
        _id: parking._id,
        verificationStatus: 'approved',
        isActive: true,
        availableSlots: { $gte: input.slotCount }
      },
      { $inc: { availableSlots: -input.slotCount } },
      { new: true, session }
    );

    if (!updatedParking) {
      throw createHttpError(409, 'Not enough parking slots available');
    }

    const [booking] = await BookingModel.create(
      [
        {
          user: user._id,
          parking: parking._id,
          vehicleType: input.vehicleType,
          bookingDate: input.bookingDate,
          startTime: input.startTime,
          endTime: input.endTime,
          slotCount: input.slotCount,
          totalAmount: calculateTotalAmount(parking, input),
          status: 'confirmed'
        }
      ],
      { session }
    );

    return serializeBooking(booking);
  });
}

export async function listMyBookings(user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const bookings = await BookingModel.find({ user: user._id }).sort({ createdAt: -1, _id: 1 }).lean();

  return bookings.map(serializeBooking);
}

export async function listAllBookings(query = {}, deps = {}) {
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

  const bookings = await BookingModel.find(filter).sort({ createdAt: -1, _id: 1 }).lean();

  return bookings.map(serializeBooking);
}

export async function getBookingDetail(id, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const booking = await findBookingById(BookingModel, id);

  if (!canAccessBooking(user, booking)) {
    throw createHttpError(403, 'You do not have permission to access this booking');
  }

  return serializeBooking(booking);
}

export async function cancelBooking(id, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const runInTransaction = deps.runInTransaction ?? withTransaction;

  return runInTransaction(async (session) => {
    const booking = await findBookingById(BookingModel, id, session);

    if (!canAccessBooking(user, booking)) {
      throw createHttpError(403, 'You do not have permission to cancel this booking');
    }

    if (booking.status === 'cancelled') {
      return serializeBooking(booking);
    }

    if (booking.status === 'completed') {
      throw createHttpError(409, 'Completed bookings cannot be cancelled');
    }

    booking.status = 'cancelled';
    await booking.save({ session });

    await ParkingModel.findByIdAndUpdate(booking.parking, { $inc: { availableSlots: booking.slotCount } }, { session });

    return serializeBooking(booking);
  });
}

async function withTransaction(work) {
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

async function findBookableParking(ParkingModel, id, session) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Parking listing not found');
  }

  const parking = await ParkingModel.findOne({
    _id: id,
    verificationStatus: 'approved',
    isActive: true
  }).session(session);

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }

  return parking;
}

async function findBookingById(BookingModel, id, session) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Booking not found');
  }

  const query = BookingModel.findById(id);
  const booking = session ? await query.session(session) : await query;

  if (!booking) {
    throw createHttpError(404, 'Booking not found');
  }

  return booking;
}

async function countOverlappingSlots(BookingModel, input, session) {
  const pipeline = [
    { $match: buildBookingOverlapFilter(input) },
    { $group: { _id: null, slotCount: { $sum: '$slotCount' } } }
  ];

  const aggregate = BookingModel.aggregate(pipeline);
  const result = session ? await aggregate.session(session) : await aggregate;

  return result[0]?.slotCount ?? 0;
}

function canAccessBooking(user, booking) {
  return user.role === 'admin' || booking.user.toString() === user._id.toString();
}

function getMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
