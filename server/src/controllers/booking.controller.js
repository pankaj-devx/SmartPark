import {
  cancelBooking,
  getBookingDetail,
  listMyBookings
} from '../services/booking.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createBookingReservation = asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Bookings are confirmed only after successful payment verification. Use /payments/create-order first.'
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
