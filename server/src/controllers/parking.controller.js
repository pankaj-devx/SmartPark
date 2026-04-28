import { asyncHandler } from '../utils/asyncHandler.js';
import {
  approveParking,
  createParking,
  getParkingDetail,
  listNearbyParkings,
  listOwnerParkings,
  listPublicParkings,
  rejectParking,
  softDeleteParking,
  updateParking
} from '../services/parking.service.js';

export const createParkingListing = asyncHandler(async (req, res) => {
  const parking = await createParking(req.body, req.user);

  res.status(201).json({
    success: true,
    data: {
      parking
    }
  });
});

export const getPublicParkingListings = asyncHandler(async (req, res) => {
  const data = await listPublicParkings(req.validatedQuery);

  res.status(200).json({
    success: true,
    data
  });
});

export const getNearbyParkingListings = asyncHandler(async (req, res) => {
  const data = await listNearbyParkings(req.validatedQuery);

  res.status(200).json({
    success: true,
    data
  });
});

export const getMyParkingListings = asyncHandler(async (req, res) => {
  const parkings = await listOwnerParkings(req.user);

  res.status(200).json({
    success: true,
    data: {
      parkings
    }
  });
});

export const getParkingListing = asyncHandler(async (req, res) => {
  const parking = await getParkingDetail(req.params.id, req.user ?? null);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const updateParkingListing = asyncHandler(async (req, res) => {
  const parking = await updateParking(req.params.id, req.body, req.user);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const deleteParkingListing = asyncHandler(async (req, res) => {
  const parking = await softDeleteParking(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const approveParkingListing = asyncHandler(async (req, res) => {
  const parking = await approveParking(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});

export const rejectParkingListing = asyncHandler(async (req, res) => {
  const parking = await rejectParking(req.params.id, req.body.reason ?? '');

  res.status(200).json({
    success: true,
    data: {
      parking
    }
  });
});
