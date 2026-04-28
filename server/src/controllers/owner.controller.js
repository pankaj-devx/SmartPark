import { completeOwnerBooking, getOwnerBookings } from '../services/owner.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOwnerBookingDashboard = asyncHandler(async (req, res) => {
  const data = await getOwnerBookings(req.user, req.validatedQuery);

  res.status(200).json({
    success: true,
    data
  });
});

export const completeOwnerBookingReservation = asyncHandler(async (req, res) => {
  const booking = await completeOwnerBooking(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: {
      booking
    }
  });
});
