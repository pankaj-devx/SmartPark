import mongoose from 'mongoose';

const parkingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude, latitude]'
        }
      }
    },
    totalSlots: {
      type: Number,
      required: true,
      min: 1
    },
    availableSlots: {
      type: Number,
      required: true,
      min: 0
    },
    vehicleTypes: {
      type: [String],
      enum: ['2-wheeler', '4-wheeler'],
      required: true
    },
    hourlyPrice: {
      type: Number,
      required: true,
      min: 1
    },
    amenities: {
      type: [String],
      enum: ['covered', 'cctv', 'ev charging', 'security', 'valet', 'accessible'],
      default: []
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

parkingSchema.index({ location: '2dsphere' });
parkingSchema.index({ verificationStatus: 1, isActive: 1, city: 1 });
parkingSchema.index({ owner: 1, createdAt: -1 });
parkingSchema.index({ title: 'text', description: 'text', address: 'text', city: 'text' });

parkingSchema.pre('validate', function validateAvailableSlots() {
  if (this.availableSlots > this.totalSlots) {
    throw new Error('Available slots cannot be greater than total slots');
  }
});

export const Parking = mongoose.model('Parking', parkingSchema);
