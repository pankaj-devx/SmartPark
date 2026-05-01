import {
  cancelBooking,
  createBooking,
  getBookingDetail,
  listMyBookings
} from '../services/booking.service.js';
import { createNotification } from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createBookingReservation = asyncHandler(async (req, res) => {
  const booking = await createBooking(req.body, req.user);

  // Fire notifications after the booking transaction commits.
  // Both are non-blocking — a notification failure must never affect the
  // booking response. We use Promise.allSettled so one failure doesn't
  // suppress the other.
  Promise.allSettled([
    // Driver: booking confirmation
    createNotification(
      req.user._id,
      'driver',
      'booking_confirmed',
      `Your booking at parking ${booking.parking} on ${booking.bookingDate} (${booking.startTime}–${booking.endTime}) is confirmed.`
    ),
    // Owner: new booking alert — requires fetching the parking to get owner id.
    // We import Parking lazily here to avoid a circular dep with parking.service.
    (async () => {
      const { Parking } = await import('../models/parking.model.js');
      const parking = await Parking.findById(booking.parking).select('owner title').lean();
      if (parking?.owner) {
        await createNotification(
          parking.owner,
          'owner',
          'new_booking',
          `New booking received for "${parking.title}" on ${booking.bookingDate} (${booking.startTime}–${booking.endTime}).`
        );
      }
    })()
  ]).catch(() => {
    // allSettled never rejects, but guard anyway
  });

  res.status(201).json({
    success: true,
    data: { booking }
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await listMyBookings(req.user);

  res.status(200).json({
    success: true,
    data: {
      bookings
    }
  });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await getBookingDetail(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: {
      booking
    }
  });
});

export const cancelBookingReservation = asyncHandler(async (req, res) => {
  const booking = await cancelBooking(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: {
      booking
    }
  });
});
