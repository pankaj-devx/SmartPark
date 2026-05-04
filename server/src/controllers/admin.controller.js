import {
  approveAdminParking,
  blockAdminUser,
  cancelAdminBooking,
  deleteAdminParking,
  getAdminDashboard,
  listAdminBookings,
  listAdminParkings,
  listAdminUsers,
  rejectAdminParking,
  toggleAdminParkingActive,
  unblockAdminUser
} from '../services/admin.service.js';
import { verifyBookingByCode } from '../services/owner.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboard = asyncHandler(async (_req, res) => {
  const data = await getAdminDashboard();

  res.status(200).json({
    success: true,
    data
  });
});

export const getParkings = asyncHandler(async (_req, res) => {
  const parkings = await listAdminParkings();

  res.status(200).json({
    success: true,
    data: {
      parkings
    }
  });
});

export const approveParking = asyncHandler(async (req, res) => {
  const parking = await approveAdminParking(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const rejectParking = asyncHandler(async (req, res) => {
  const parking = await rejectAdminParking(req.params.id, req.body.reason);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const toggleParkingActive = asyncHandler(async (req, res) => {
  const parking = await toggleAdminParkingActive(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const getBookings = asyncHandler(async (req, res) => {
  const bookings = await listAdminBookings(req.validatedQuery);

  res.status(200).json({
    success: true,
    data: {
      bookings
    }
  });
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await listAdminUsers();

  res.status(200).json({
    success: true,
    data: {
      users
    }
  });
});

export const blockUser = asyncHandler(async (req, res) => {
  const user = await blockAdminUser(req.params.id, req.user._id.toString());

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const user = await unblockAdminUser(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

export const deleteParking = asyncHandler(async (req, res) => {
  const result = await deleteAdminParking(req.params.id);

  console.log(`[admin] User ${req.user._id} deleted parking ${req.params.id}`);

  res.status(200).json({
    success: true,
    data: result
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await cancelAdminBooking(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      booking
    }
  });
});

export const verifyBooking = asyncHandler(async (req, res) => {
  const booking = await verifyBookingByCode(req.body.bookingCode, req.user);

  res.status(200).json({
    success: true,
    data: {
      booking
    }
  });
});
