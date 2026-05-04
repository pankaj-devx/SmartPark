import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];

/**
 * Returns true only when the booking start datetime is strictly in the future.
 *
 * Both arguments are compared against the current server time with no manual
 * timezone offset — Date parsing of "YYYY-MM-DDTHH:mm:00" uses the local
 * system timezone, which is consistent with how computeBookingStatus works.
 *
 * @param {string} bookingDate  "YYYY-MM-DD"
 * @param {string} startTime    "HH:mm"
 * @returns {boolean}
 */
export function isFutureBooking(bookingDate, startTime) {
  const now = new Date();
  const bookingDateTime = new Date(`${bookingDate}T${startTime}:00`);
  return bookingDateTime > now;
}

/**
 * Derive a time-aware display status for a booking.
 *
 * Cancelled/completed bookings keep their stored status.
 * For active bookings (pending/confirmed) we compare the current time
 * against the booking window so the UI can show "upcoming", "ongoing",
 * or "completed" without a background job.
 *
 * bookingDate is stored as "YYYY-MM-DD", startTime/endTime as "HH:MM".
 * We parse them in local server time (no UTC shift) so the window aligns
 * with what the user entered.
 */
export function computeBookingStatus(booking) {
  // Cancelled stays cancelled; stored "completed" stays completed.
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return booking.status;
  }

  try {
    const now = new Date();
    const start = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
    const end   = new Date(`${booking.bookingDate}T${booking.endTime}:00`);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  } catch {
    // If date parsing fails for any reason, fall back to stored status.
    return booking.status;
  }
}

/**
 * Reconcile expired bookings for a parking listing.
 *
 * Finds all confirmed/pending bookings for the given parking whose time
 * window has fully passed, marks them completed, and restores their slot
 * counts to the parking's availableSlots field — all in a single atomic
 * operation.
 *
 * This is called lazily on parking reads so availableSlots stays accurate
 * without a background job. It is idempotent: running it twice is safe.
 *
 * @param {string|ObjectId} parkingId
 * @param {object} deps - injectable for testing
 */
export async function reconcileExpiredBookings(parkingId, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Find all active bookings for this parking whose end window has passed.
  // A booking is expired when:
  //   bookingDate < today  →  entirely in the past
  //   bookingDate === today AND endTime <= currentTime  →  ended today
  const expiredBookings = await BookingModel.find({
    parking: parkingId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    $or: [
      { bookingDate: { $lt: todayStr } },
      { bookingDate: todayStr, endTime: { $lte: currentTime } }
    ]
  }).lean();

  if (expiredBookings.length === 0) {
    return 0; // nothing to do
  }

  const expiredIds = expiredBookings.map((b) => b._id);
  const slotsToRestore = expiredBookings.reduce((sum, b) => sum + b.slotCount, 0);

  // Mark all expired bookings as completed and restore slots atomically.
  await Promise.all([
    BookingModel.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { status: 'completed' } }
    ),
    ParkingModel.findByIdAndUpdate(
      parkingId,
      { $inc: { availableSlots: slotsToRestore } }
    )
  ]);

  // Clamp availableSlots to totalSlots (safety net)
  await ParkingModel.updateOne(
    { _id: parkingId },
    [{ $set: { availableSlots: { $min: ['$availableSlots', '$totalSlots'] } } }]
  );

  return expiredBookings.length;
}

/**
 * Compute the real-time available slot count for a parking at the current
 * moment by counting active bookings that overlap right now.
 *
 * Used to enrich list responses (search, nearby) without modifying the DB.
 * The stored availableSlots field is kept for DB-level filtering/sorting;
 * this value is what clients should display.
 *
 * @param {string|ObjectId} parkingId
 * @param {number} totalSlots
 * @param {object} deps
 * @returns {Promise<number>}
 */
export async function computeLiveAvailableSlots(parkingId, totalSlots, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const result = await BookingModel.aggregate([
    {
      $match: {
        parking: new mongoose.Types.ObjectId(parkingId.toString()),
        status: { $in: ACTIVE_BOOKING_STATUSES },
        bookingDate: todayStr,
        startTime: { $lte: currentTime },
        endTime: { $gt: currentTime }
      }
    },
    {
      $group: { _id: null, occupiedSlots: { $sum: '$slotCount' } }
    }
  ]);

  const occupiedNow = result[0]?.occupiedSlots ?? 0;
  return Math.max(0, totalSlots - occupiedNow);
}

/**
 * Compute live available slots for multiple parkings in a single aggregation.
 * Returns a Map of parkingId (string) → liveAvailableSlots (number).
 *
 * @param {Array<{id: string, totalSlots: number}>} parkings
 * @param {object} deps
 * @returns {Promise<Map<string, number>>}
 */
export async function computeLiveAvailableSlotsForMany(parkings, deps = {}) {
  if (parkings.length === 0) return new Map();

  const BookingModel = deps.BookingModel ?? Booking;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const parkingIds = parkings.map((p) => new mongoose.Types.ObjectId(p.id.toString()));

  const occupied = await BookingModel.aggregate([
    {
      $match: {
        parking: { $in: parkingIds },
        status: { $in: ACTIVE_BOOKING_STATUSES },
        bookingDate: todayStr,
        startTime: { $lte: currentTime },
        endTime: { $gt: currentTime }
      }
    },
    {
      $group: { _id: '$parking', occupiedSlots: { $sum: '$slotCount' } }
    }
  ]);

  const occupiedMap = new Map(occupied.map((r) => [r._id.toString(), r.occupiedSlots]));

  const result = new Map();
  for (const p of parkings) {
    const idStr = p.id.toString();
    const occupiedNow = occupiedMap.get(idStr) ?? 0;
    result.set(idStr, Math.max(0, p.totalSlots - occupiedNow));
  }

  return result;
}

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
    paymentStatus: booking.paymentStatus ?? 'pending',
    isTestPayment: booking.isTestPayment ?? false,
    paymentExpiresAt: booking.paymentExpiresAt,
    computedStatus: computeBookingStatus(booking),
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

  if (!isFutureBooking(input.bookingDate, input.startTime)) {
    throw createHttpError(400, 'Cannot book a past time slot');
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
          status: 'pending',
          paymentStatus: 'pending',
          isTestPayment: false,
          paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
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
