import {
  cancelBooking,
  createBooking,
  getBookingDetail,
  listMyBookings
} from '../services/booking.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createBookingReservation = asyncHandler(async (req, res) => {
  const booking = await createBooking(req.body, req.user);

  res.status(201).json({
    success: true,
    data: {
      booking
    }
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
