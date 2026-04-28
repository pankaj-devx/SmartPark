import {
  approveAdminParking,
  getAdminDashboard,
  listAdminBookings,
  listAdminParkings,
  rejectAdminParking,
  toggleAdminParkingActive
} from '../services/admin.service.js';
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
