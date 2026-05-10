import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';
import { generateUniqueCode, CODE_PREFIXES } from '../utils/codeGenerator.js';
import {
  validateBookingInput,
  formatValidationErrors
} from '../utils/bookingValidation.js';
import {
  calculateOccupiedSlots,
  buildOccupancyFilter
} from './occupancy.service.js';
import { getIO } from '../config/socket.js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];
const KOLKATA_OFFSET_MINUTES = 330;

/**
 * Returns true only when the booking start datetime is at least 30 minutes in the future.
 *
 * Both arguments are interpreted as Asia/Kolkata wall-clock time so production
 * servers in other timezones evaluate the same booking window consistently.
 *
 * @param {string} bookingDate  "YYYY-MM-DD"
 * @param {string} startTime    "HH:mm"
 * @returns {boolean}
 */
export function isFutureBooking(bookingDate, startTime) {
  const minimumStartTime = Date.now() + 30 * 60 * 1000;
  const bookingDateTime = getKolkataDateTimeMs(bookingDate, startTime);
  return bookingDateTime > minimumStartTime;
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
    const now = Date.now();
    const start = getKolkataDateTimeMs(booking.bookingDate, booking.startTime);
    const end = getKolkataDateTimeMs(booking.bookingDate, booking.endTime);

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
 * window has fully passed and marks them completed.
 *
 * This is called lazily on parking reads for data hygiene.
 * It is idempotent: running it twice is safe.
 *
 * Note: Availability is computed dynamically from live booking data,
 * so no slot field mutation is needed. Marking bookings as completed
 * automatically excludes them from occupancy calculations.
 *
 * @param {string|ObjectId} parkingId
 * @param {object} deps - injectable for testing
 */
export async function reconcileExpiredBookings(parkingId, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;

  const { date: todayStr, time: currentTime } = getKolkataNowParts();

  // Find all active bookings for this parking whose end window has passed.
  // A booking is expired when:
  //   bookingDate < today  →  entirely in the past
  //   bookingDate === today AND endTime <= currentTime  →  ended today
  const result = await BookingModel.updateMany(
    {
      parking: parkingId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      $or: [
        { bookingDate: { $lt: todayStr } },
        { bookingDate: todayStr, endTime: { $lte: currentTime } }
      ]
    },
    { $set: { status: 'completed' } }
  );

  const modifiedCount = result.modifiedCount ?? 0;
  
  // If bookings were auto-completed, emit socket event to update admin/owner dashboards
  if (modifiedCount > 0) {
    console.log(`[BookingService] Auto-completed ${modifiedCount} expired booking(s) for parking:`, parkingId);
    
    // Recalculate RESERVED SLOTS after auto-completion
    const { calculateReservedSlots } = await import('./occupancy.service.js');
    const { Parking } = await import('../models/parking.model.js');
    const { getIO } = await import('../config/socket.js');
    
    const parking = await Parking.findById(parkingId).lean();
    if (parking) {
      const reservedSlots = await calculateReservedSlots(parkingId, { BookingModel });
      
      const io = getIO();
      if (io) {
        const eventData = {
          parkingId: parkingId.toString(),
          action: 'auto_completed',
          totalSlots: parking.totalSlots,
          reservedSlots,
          occupiedSlots: reservedSlots,
          availableSlots: Math.max(0, parking.totalSlots - reservedSlots)
        };
        console.log('[BookingService] Emitting parking_slots_updated event (auto-completion):', eventData);
        io.emit('parking_slots_updated', eventData);
      }
    }
  }

  return modifiedCount;
}

export function serializeBooking(booking) {
  return {
    id: booking._id.toString(),
    bookingCode: booking.bookingCode,
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.(),
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.(),
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    slotCount: booking.slotCount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    bookingStatus: booking.bookingStatus ?? (booking.status === 'cancelled' ? 'cancelled' : 'confirmed'),
    paymentStatus: booking.paymentStatus ?? 'pending',
    isTestPayment: booking.isTestPayment ?? false,
    paymentExpiresAt: booking.paymentExpiresAt,
    computedStatus: computeBookingStatus(booking),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

/**
 * Build optimized query filter for finding overlapping bookings
 * Uses indexed fields for performance
 * Uses centralized occupancy service for consistent business logic
 * 
 * @param {object} input - Booking input with parking, bookingDate, startTime, endTime
 * @returns {object} - MongoDB query filter
 */
export function buildBookingOverlapFilter(input) {
  return buildOccupancyFilter(input);
}

export function calculateTotalAmount(parking, input) {
  const durationMinutes = getMinutes(input.endTime) - getMinutes(input.startTime);
  const billableHours = Math.ceil(durationMinutes / 60);
  // Use vehicle-specific rate when available, fall back to hourlyPrice
  const rate = parking.pricing?.get?.(input.vehicleType) ?? parking.pricing?.[input.vehicleType] ?? parking.hourlyPrice;

  return billableHours * rate * input.slotCount;
}

export async function createBooking(input, user, deps = {}) {
  return createConfirmedBooking(input, user, { ...deps, paymentStatus: 'pending', status: 'pending' });
}

export async function createConfirmedBooking(input, user, deps = {}) {
  // 1. Check user status
  if (user.status === 'suspended') {
    throw createHttpError(403, 'Your account has been suspended. You cannot create new bookings.');
  }

  // 2. Comprehensive input validation
  const inputValidation = validateBookingInput(input);
  if (!inputValidation.valid) {
    throw createHttpError(400, formatValidationErrors(inputValidation.errors));
  }

  // 3. Additional time validation (30-minute minimum)
  if (!isFutureBooking(input.bookingDate, input.startTime)) {
    throw createHttpError(400, 'Selected time is invalid (minimum 30 minutes required)');
  }

  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const runInTransaction = deps.runInTransaction ?? withTransaction;
  const paymentStatus = deps.paymentStatus ?? 'paid';
  const bookingStatus = deps.bookingStatus ?? 'confirmed';
  const status = deps.status ?? 'confirmed';

  // 4. Use transaction to prevent race conditions
  return runInTransaction(async (session) => {
    // 5. Find and validate parking
    const parking = await findBookableParking(ParkingModel, input.parking, session);

    // 6. Validate vehicle type
    if (!parking.vehicleTypes.includes(input.vehicleType)) {
      throw createHttpError(409, 'Vehicle type is not supported by this parking listing');
    }

    // 7. Check for overlapping bookings (CRITICAL: prevents double booking)
    await lockParkingForCapacityCheck(ParkingModel, parking._id, session);
    const overlappingSlots = await calculateOccupiedSlots(
      parking._id,
      {
        bookingDate: input.bookingDate,
        startTime: input.startTime,
        endTime: input.endTime
      },
      { BookingModel }
    );

    // 8. Validate slot availability
    const availableSlots = Math.max(0, parking.totalSlots - overlappingSlots);

    if (input.slotCount < 1) {
      throw createHttpError(400, 'At least one slot must be requested');
    }

    if (input.slotCount > availableSlots) {
      const error =
        availableSlots === 0
          ? 'No slots available for selected time'
          : `Only ${availableSlots} slot(s) available for selected time`;
      throw createHttpError(409, error);
    }

    // 9. Generate unique booking code
    const bookingCode = await generateUniqueCode(
      CODE_PREFIXES.BOOKING,
      async (code) => {
        const existing = await BookingModel.findOne({ bookingCode: code }).session(session);
        return !existing;
      }
    );

    // 10. Create booking only after the caller has verified payment.
    const [booking] = await BookingModel.create(
      [
        {
          bookingCode,
          user: user._id,
          parking: parking._id,
          vehicleType: input.vehicleType,
          bookingDate: input.bookingDate,
          startTime: input.startTime,
          endTime: input.endTime,
          slotCount: input.slotCount,
          totalAmount: calculateTotalAmount(parking, input),
          status,
          bookingStatus,
          paymentStatus,
          isTestPayment: deps.isTestPayment ?? false,
          razorpayOrderId: deps.razorpayOrderId ?? '',
          razorpayPaymentId: deps.razorpayPaymentId ?? '',
          paymentExpiresAt: null
        }
      ],
      { session }
    );

    console.log('Booking Created');
    
    // Emit real-time event with RESERVED SLOTS (all confirmed bookings)
    const io = getIO();
    if (io) {
      const { calculateReservedSlots } = await import('./occupancy.service.js');
      const reservedSlots = await calculateReservedSlots(parking._id, { BookingModel });
      const eventData = {
        parkingId: parking._id.toString(),
        action: 'created',
        bookingId: booking._id.toString(),
        totalSlots: parking.totalSlots,
        reservedSlots,
        occupiedSlots: reservedSlots,  // For UI consistency
        availableSlots: Math.max(0, parking.totalSlots - reservedSlots)
      };
      console.log('[BookingService] Emitting parking_slots_updated event:', eventData);
      io.emit('parking_slots_updated', eventData);
    } else {
      console.warn('[BookingService] Socket.IO not available, cannot emit parking_slots_updated event');
    }
    
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

    if (!isBeforeBookingStart(booking)) {
      throw createHttpError(409, 'Bookings cannot be cancelled after the start time.');
    }

    // Get parking and user details for notifications
    const parking = await ParkingModel.findById(booking.parking).populate('owner', 'name email _id').session(session);
    if (!parking) {
      throw createHttpError(404, 'Parking not found');
    }

    const UserModel = deps.UserModel ?? (await import('../models/user.model.js')).User;
    const bookingUser = await UserModel.findById(booking.user).select('name email _id').session(session);

    if (booking.status !== 'cancelled') {
      booking.status = 'cancelled';
      booking.bookingStatus = 'cancelled';
      booking.cancelledBy = user.role === 'admin' ? 'admin' : 'user';
      await booking.save({ session });
      // Note: Availability is computed dynamically from live booking data.
      // Cancelled bookings are automatically excluded from occupancy calculations.
    }

    console.log('Booking Cancelled');
    
    // Recalculate RESERVED SLOTS after cancellation to emit accurate counts
    if (parking) {
      const { calculateReservedSlots } = await import('./occupancy.service.js');
      const reservedSlots = await calculateReservedSlots(parking._id, { BookingModel });
      
      // Emit real-time event to notify parking owner and admins about slot update
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
        console.log('[BookingService] Emitting parking_slots_updated event (cancellation):', eventData);
        io.emit('parking_slots_updated', eventData);
      } else {
        console.warn('[BookingService] Socket.IO not available, cannot emit parking_slots_updated event');
      }
    }

    // Send cancellation notifications (fire-and-forget, don't block transaction)
    Promise.resolve().then(async () => {
      try {
        const { createNotification } = await import('./notification.service.js');
        const { formatBookingCancelledNotification } = await import('../utils/notificationFormatter.js');
        const cancelledBy = booking.cancelledBy === 'admin' ? 'Admin' : 'User';
        
        // Format notification message with improved UX
        const notificationMessage = formatBookingCancelledNotification(
          booking,
          parking,
          cancelledBy
        );

        // Notify user (driver)
        if (bookingUser) {
          await createNotification(
            bookingUser._id,
            'driver',
            'booking_cancelled',
            notificationMessage,
            deps
          );
          console.log('[BookingService] Cancellation notification sent to user:', bookingUser._id);
        }

        // Notify parking owner
        if (parking.owner) {
          await createNotification(
            parking.owner._id,
            'owner',
            'booking_cancelled',
            notificationMessage,
            deps
          );
          console.log('[BookingService] Cancellation notification sent to owner:', parking.owner._id);
        }

        // Notify all admins
        const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
        for (const admin of admins) {
          await createNotification(
            admin._id,
            'admin',
            'booking_cancelled',
            notificationMessage,
            deps
          );
        }
        console.log('[BookingService] Cancellation notifications sent to', admins.length, 'admins');
      } catch (notificationError) {
        console.error('[BookingService] Failed to send cancellation notifications:', notificationError);
        // Don't throw - notifications are non-critical
      }
    });
    
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



async function lockParkingForCapacityCheck(ParkingModel, parkingId, session) {
  if (typeof ParkingModel.findOneAndUpdate !== 'function') {
    return;
  }

  const query = ParkingModel.findOneAndUpdate(
    {
      _id: parkingId,
      verificationStatus: 'approved',
      isActive: true
    },
    { $set: { updatedAt: new Date() } },
    { new: true, session }
  );

  const parking =
    session && typeof query.session === 'function'
      ? await query.session(session)
      : await query;

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }
}

function canAccessBooking(user, booking) {
  return user.role === 'admin' || booking.user.toString() === user._id.toString();
}

function getMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isBeforeBookingStart(booking) {
  return Date.now() < getKolkataDateTimeMs(booking.bookingDate, booking.startTime);
}

function getKolkataDateTimeMs(bookingDate, time) {
  const [year, month, day] = bookingDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - KOLKATA_OFFSET_MINUTES * 60 * 1000;
}

function getKolkataNowParts(now = new Date()) {
  const kolkataNow = new Date(now.getTime() + KOLKATA_OFFSET_MINUTES * 60 * 1000);
  return {
    date: kolkataNow.toISOString().slice(0, 10),
    time: kolkataNow.toISOString().slice(11, 16)
  };
}
