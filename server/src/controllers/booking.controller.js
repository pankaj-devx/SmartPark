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
  // Non-blocking — a notification failure must never affect the booking response.
  Promise.allSettled([
    (async () => {
      const { Parking } = await import('../models/parking.model.js');
      const parking = await Parking.findById(booking.parking).select('owner title').lean();
      if (!parking) return;

      const date      = formatBookingDate(booking.bookingDate);
      const startTime = formatBookingTime(booking.startTime);
      const endTime   = formatBookingTime(booking.endTime);

      await Promise.allSettled([
        // Driver: booking confirmation with parking name and readable times
        createNotification(
          req.user._id,
          'driver',
          'booking_confirmed',
          `Your booking at ${parking.title} on ${date} from ${startTime} to ${endTime} is confirmed.`
        ),
        // Owner: new booking alert
        parking.owner
          ? createNotification(
              parking.owner,
              'owner',
              'new_booking',
              `New booking received for "${parking.title}" on ${date} from ${startTime} to ${endTime}.`
            )
          : Promise.resolve()
      ]);
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

// ── Notification formatting helpers ──────────────────────────────────────────

/**
 * Format a booking date string (YYYY-MM-DD) to a readable form.
 * e.g. "2026-05-02" → "May 2, 2026"
 */
function formatBookingDate(dateStr) {
  try {
    // Append T00:00:00 so the Date is parsed in local time, not UTC
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format a 24-hour time string (HH:MM) to 12-hour AM/PM.
 * e.g. "13:32" → "1:32 PM"  |  "09:00" → "9:00 AM"
 */
function formatBookingTime(timeStr) {
  try {
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour   = Number(hourStr);
    const minute = Number(minuteStr);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}
