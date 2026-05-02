import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { Review } from '../models/review.model.js';
import { computeBookingStatus } from './booking.service.js';
import { createHttpError } from '../utils/createHttpError.js';

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function serializeReview(review) {
  return {
    id: review._id.toString(),
    user: review.user?._id
      ? {
          id: review.user._id.toString(),
          name: review.user.name ?? 'Unknown'
        }
      : review.user?.toString?.(),
    parking: review.parking?._id
      ? {
          id: review.parking._id.toString(),
          title: review.parking.title ?? ''
        }
      : review.parking?.toString?.(),
    booking: review.booking?._id?.toString?.() ?? review.booking?.toString?.(),
    rating: review.rating,
    comment: review.comment ?? '',
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

// ---------------------------------------------------------------------------
// Driver: create a review
// ---------------------------------------------------------------------------

/**
 * Create a review for a completed booking.
 *
 * Rules enforced:
 *  1. Booking must exist and belong to the requesting user.
 *  2. Booking status must be "completed".
 *  3. No existing review for this booking (unique index + pre-check).
 */
export async function createReview(input, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ReviewModel = deps.ReviewModel ?? Review;

  // 1. Validate booking ownership
  if (!mongoose.Types.ObjectId.isValid(input.bookingId)) {
    throw createHttpError(404, 'Booking not found');
  }

  const booking = await BookingModel.findById(input.bookingId).lean();

  if (!booking) {
    throw createHttpError(404, 'Booking not found');
  }

  if (booking.user.toString() !== user._id.toString()) {
    throw createHttpError(403, 'You can only review your own bookings');
  }

  // 2. Booking must be completed (stored status OR time-expired)
  if (computeBookingStatus(booking) !== 'completed') {
    throw createHttpError(409, 'You can only review completed bookings');
  }

  // 3. Prevent duplicate review (pre-check before hitting the unique index)
  const existing = await ReviewModel.findOne({ booking: booking._id }).lean();

  if (existing) {
    throw createHttpError(409, 'You have already reviewed this booking');
  }

  const review = await ReviewModel.create({
    user: user._id,
    parking: booking.parking,
    booking: booking._id,
    rating: input.rating,
    comment: input.comment ?? ''
  });

  const populated = await ReviewModel.findById(review._id)
    .populate('user', 'name')
    .populate('parking', 'title')
    .lean();

  return serializeReview(populated);
}

// ---------------------------------------------------------------------------
// Driver: list own reviews
// ---------------------------------------------------------------------------

export async function listMyReviews(user, deps = {}) {
  const ReviewModel = deps.ReviewModel ?? Review;

  const reviews = await ReviewModel.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate('parking', 'title')
    .lean();

  return reviews.map(serializeReview);
}

// ---------------------------------------------------------------------------
// Public: reviews for a parking listing
// ---------------------------------------------------------------------------

/**
 * Returns reviews + aggregate stats for a parking listing.
 */
export async function getParkingReviews(parkingId, deps = {}) {
  const ReviewModel = deps.ReviewModel ?? Review;
  const ParkingModel = deps.ParkingModel ?? Parking;

  if (!mongoose.Types.ObjectId.isValid(parkingId)) {
    throw createHttpError(404, 'Parking listing not found');
  }

  const parking = await ParkingModel.findById(parkingId).lean();

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }

  const [reviews, stats] = await Promise.all([
    ReviewModel.find({ parking: parkingId })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .lean(),

    ReviewModel.aggregate([
      { $match: { parking: new mongoose.Types.ObjectId(parkingId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingBreakdown: {
            $push: '$rating'
          }
        }
      }
    ])
  ]);

  const aggregate = stats[0] ?? { averageRating: 0, totalReviews: 0, ratingBreakdown: [] };

  // Build rating distribution (1–5 star counts)
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of aggregate.ratingBreakdown) {
    distribution[r] = (distribution[r] ?? 0) + 1;
  }

  return {
    reviews: reviews.map(serializeReview),
    stats: {
      averageRating: aggregate.averageRating
        ? Number(aggregate.averageRating.toFixed(1))
        : 0,
      totalReviews: aggregate.totalReviews,
      distribution
    }
  };
}

// ---------------------------------------------------------------------------
// Owner: reviews for all their parkings
// ---------------------------------------------------------------------------

export async function getOwnerReviews(user, deps = {}) {
  const ReviewModel = deps.ReviewModel ?? Review;
  const ParkingModel = deps.ParkingModel ?? Parking;

  // Collect all parking IDs owned by this user
  const parkings = await ParkingModel.find({ owner: user._id }, '_id title').lean();
  const parkingIds = parkings.map((p) => p._id);

  if (parkingIds.length === 0) {
    return { reviews: [], stats: { averageRating: 0, totalReviews: 0 }, parkings: [] };
  }

  const [reviews, stats] = await Promise.all([
    ReviewModel.find({ parking: { $in: parkingIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .populate('parking', 'title')
      .lean(),

    ReviewModel.aggregate([
      { $match: { parking: { $in: parkingIds } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ])
  ]);

  const aggregate = stats[0] ?? { averageRating: 0, totalReviews: 0 };

  // Per-parking stats
  const perParking = await ReviewModel.aggregate([
    { $match: { parking: { $in: parkingIds } } },
    {
      $group: {
        _id: '$parking',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const parkingStatsMap = Object.fromEntries(
    perParking.map((item) => [
      item._id.toString(),
      {
        averageRating: Number(item.averageRating.toFixed(1)),
        totalReviews: item.totalReviews
      }
    ])
  );

  return {
    reviews: reviews.map(serializeReview),
    stats: {
      averageRating: aggregate.averageRating
        ? Number(aggregate.averageRating.toFixed(1))
        : 0,
      totalReviews: aggregate.totalReviews
    },
    parkings: parkings.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      ...(parkingStatsMap[p._id.toString()] ?? { averageRating: 0, totalReviews: 0 })
    }))
  };
}

// ---------------------------------------------------------------------------
// Admin: all reviews
// ---------------------------------------------------------------------------

export async function getAllReviews(deps = {}) {
  const ReviewModel = deps.ReviewModel ?? Review;

  const reviews = await ReviewModel.find()
    .sort({ createdAt: -1 })
    .populate('user', 'name email')
    .populate('parking', 'title')
    .lean();

  return reviews.map(serializeReview);
}

// ---------------------------------------------------------------------------
// Admin: delete a review
// ---------------------------------------------------------------------------

export async function deleteReview(id, deps = {}) {
  const ReviewModel = deps.ReviewModel ?? Review;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Review not found');
  }

  const review = await ReviewModel.findByIdAndDelete(id).lean();

  if (!review) {
    throw createHttpError(404, 'Review not found');
  }

  return { id: review._id.toString() };
}

// ---------------------------------------------------------------------------
// Utility: check if a booking has already been reviewed (used by frontend)
// ---------------------------------------------------------------------------

export async function getReviewedBookingIds(userId, bookingIds, deps = {}) {
  const ReviewModel = deps.ReviewModel ?? Review;

  const validIds = bookingIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    return [];
  }

  const reviews = await ReviewModel.find(
    { user: userId, booking: { $in: validIds } },
    'booking'
  ).lean();

  return reviews.map((r) => r.booking.toString());
}
