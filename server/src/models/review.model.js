import mongoose from 'mongoose';

/**
 * Review Model
 *
 * One review per booking (enforced by unique index on `booking`).
 * Linked to both the parking and the user for efficient querying.
 */
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    parking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parking',
      required: true,
      index: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      // Enforces one review per booking at the database level
      unique: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Efficient lookup: all reviews for a parking, sorted newest first
reviewSchema.index({ parking: 1, createdAt: -1 });

// Efficient lookup: all reviews by a user
reviewSchema.index({ user: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
