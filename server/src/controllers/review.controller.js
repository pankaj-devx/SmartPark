import {
  createReview,
  deleteReview,
  getAllReviews,
  getOwnerReviews,
  getParkingReviews,
  getReviewedBookingIds,
  listMyReviews
} from '../services/review.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

export const submitReview = asyncHandler(async (req, res) => {
  const review = await createReview(req.body, req.user);

  res.status(201).json({
    success: true,
    data: { review }
  });
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await listMyReviews(req.user);

  res.status(200).json({
    success: true,
    data: { reviews }
  });
});

/**
 * POST /api/reviews/reviewed-bookings
 * Body: { bookingIds: string[] }
 *
 * Returns the subset of bookingIds that already have a review.
 * Used by the frontend to disable "Leave Review" buttons.
 */
export const getReviewedBookings = asyncHandler(async (req, res) => {
  const bookingIds = req.body.bookingIds ?? [];
  const reviewedIds = await getReviewedBookingIds(req.user._id, bookingIds);

  res.status(200).json({
    success: true,
    data: { reviewedBookingIds: reviewedIds }
  });
});

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export const getParkingReviewsHandler = asyncHandler(async (req, res) => {
  const result = await getParkingReviews(req.params.parkingId);

  res.status(200).json({
    success: true,
    data: result
  });
});

// ---------------------------------------------------------------------------
// Owner
// ---------------------------------------------------------------------------

export const getOwnerReviewsHandler = asyncHandler(async (req, res) => {
  const result = await getOwnerReviews(req.user);

  res.status(200).json({
    success: true,
    data: result
  });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const getAllReviewsHandler = asyncHandler(async (_req, res) => {
  const reviews = await getAllReviews();

  res.status(200).json({
    success: true,
    data: { reviews }
  });
});

export const deleteReviewHandler = asyncHandler(async (req, res) => {
  const result = await deleteReview(req.params.id);

  res.status(200).json({
    success: true,
    data: result
  });
});
