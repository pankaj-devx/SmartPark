import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['driver', 'owner'],
      required: true
    },
    type: {
      type: String,
      enum: ['booking_confirmed', 'new_booking', 'booking_cancelled'],
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient per-user unread queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
