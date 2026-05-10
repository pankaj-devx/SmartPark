import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';
import { serializeBooking } from './booking.service.js';
import { calculateOwnerAnalytics } from './analytics.service.js';
import { serializeParking } from './parking.service.js';
import { getIO } from '../config/socket.js';

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

  const [bookings, parkings, ownerAnalytics] = await Promise.all([
    bookingsQuery.sort({ bookingDate: 1, startTime: 1, _id: 1 }).lean(),
    getOwnerParkings(user, deps),
    calculateOwnerAnalytics(user._id, deps)
  ]);

  const serializedBookings = bookings.map(serializeOwnerBooking);

  // Build occupancy map from analytics (derived from live confirmed bookings —
  // active now + upcoming reservations). This is the single source of truth
  // for slot display in the owner dashboard.
  const occupancyByListing = new Map(
    (ownerAnalytics.occupancyStats?.occupancyByListing ?? []).map((item) => [item.parking, item])
  );
  const serializedParkings = parkings.map((p) => {
    const serialized = serializeParking(p);
    const occupancy = occupancyByListing.get(p._id.toString());

    return {
      ...serialized,
      ...(occupancy
        ? {
            availableSlots: Math.max(0, serialized.totalSlots - occupancy.reservedSlots),
            occupiedSlots: occupancy.reservedSlots,
            activeOccupiedSlots: occupancy.activeOccupiedSlots,
            upcomingReservedSlots: occupancy.upcomingReservedSlots
          }
        : {})
    };
  });

  return {
    bookings: serializedBookings,
    summary: buildOwnerSummary(serializedBookings, serializedParkings, ownerAnalytics),
    parkings: serializedParkings
  };
}

export async function completeOwnerBooking(id, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const runInTransaction = deps.runInTransaction
    ?? (deps.BookingModel || deps.ParkingModel ? (work) => work(null) : withOwnerTransaction);

  return runInTransaction(async (session) => {
    const booking = await findBookingForOwner(BookingModel, ParkingModel, id, user, session);

    if (booking.status === 'cancelled') {
      throw createHttpError(409, 'Cancelled bookings cannot be completed');
    }

    if (booking.status === 'completed') {
      return serializeBooking(booking);
    }

    booking.status = 'completed';
    await booking.save({ session });
    // Note: Availability is computed dynamically from live booking data.
    // Completed bookings are automatically excluded from occupancy calculations.

    console.log('Booking Completed');
    
    // Recalculate RESERVED SLOTS after completion to emit accurate counts
    const parking = await ParkingModel.findById(booking.parking).populate('owner', 'name').session(session);
    if (parking) {
      const { calculateReservedSlots } = await import('./occupancy.service.js');
      const reservedSlots = await calculateReservedSlots(parking._id, { BookingModel });
      
      // Emit real-time event to notify parking owner and admins about slot update
      const io = getIO();
      if (io) {
        const eventData = {
          parkingId: parking._id.toString(),
          action: 'completed',
          bookingId: booking._id.toString(),
          totalSlots: parking.totalSlots,
          reservedSlots,
          occupiedSlots: reservedSlots,  // For UI consistency
          availableSlots: Math.max(0, parking.totalSlots - reservedSlots)
        };
        console.log('[OwnerService] Emitting parking_slots_updated event (completion):', eventData);
        io.emit('parking_slots_updated', eventData);
      } else {
        console.warn('[OwnerService] Socket.IO not available, cannot emit parking_slots_updated event');
      }

      // Send completion notification to user (fire-and-forget)
      Promise.resolve().then(async () => {
        try {
          const { createNotification } = await import('./notification.service.js');
          const { formatBookingCompletedNotification } = await import('../utils/notificationFormatter.js');
          
          const notificationMessage = formatBookingCompletedNotification(booking, parking);
          
          await createNotification(
            booking.user,
            'driver',
            'booking_completed',
            notificationMessage,
            deps
          );
          console.log('[OwnerService] Completion notification sent to user:', booking.user);
        } catch (notificationError) {
          console.error('[OwnerService] Failed to send completion notification:', notificationError);
          // Don't throw - notifications are non-critical
        }
      });
    }
    
    return serializeBooking(booking);
  });
}

async function withOwnerTransaction(work) {
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

async function findBookingForOwner(BookingModel, ParkingModel, id, user, session) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Booking not found');
  }

  const bookingQuery = BookingModel.findById(id);
  const booking = session && typeof bookingQuery.session === 'function' ? await bookingQuery.session(session) : await bookingQuery;

  if (!booking) {
    throw createHttpError(404, 'Booking not found');
  }

  const parkingQuery = ParkingModel.findOne({ _id: booking.parking, owner: user._id });
  const parking = session && typeof parkingQuery.session === 'function' ? await parkingQuery.session(session) : await parkingQuery;

  if (!parking) {
    throw createHttpError(403, 'You can only manage bookings for your own parking listings');
  }

  return booking;
}

function buildOwnerSummary(bookings, parkings, ownerAnalytics = {}) {
  const occupancyStats = ownerAnalytics.occupancyStats ?? {};
  const revenueByListing = ownerAnalytics.revenueByListing ?? [];
  const estimatedRevenue = ownerAnalytics.totalRevenue ?? 0;

  return {
    occupiedSlotsNow: occupancyStats.occupiedSlotsNow ?? occupancyStats.reservedSlots ?? 0,  // Use correct field
    availableSlotsNow: occupancyStats.availableSlotsNow ?? 0,  // Use correct field
    upcomingReservations: occupancyStats.upcomingReservations ?? 0,
    upcomingReservedSlots: occupancyStats.upcomingReservedSlots ?? 0,
    reservedSlots: occupancyStats.reservedSlots ?? 0,
    estimatedRevenue,
    bookingCounts: {
      total: bookings.length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
      completed: bookings.filter((booking) => booking.status === 'completed').length,
      pending: bookings.filter((booking) => booking.status === 'pending').length
    },
    perListingEarnings: revenueByListing
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
    bookingStatus: booking.bookingStatus ?? (booking.status === 'cancelled' ? 'cancelled' : 'confirmed'),
    paymentStatus: booking.paymentStatus ?? 'pending',
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}
