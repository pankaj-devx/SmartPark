import mongoose from 'mongoose';

const vehicleDetailSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    registrationNumber: { type: String, trim: true, default: '' },
    vehicleType: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const savedAddressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['driver', 'owner', 'admin'],
      default: 'driver',
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    profilePhotoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
      compactMode: { type: Boolean, default: false }
    },
    driverProfile: {
      vehicleDetails: {
        type: [vehicleDetailSchema],
        default: []
      },
      savedAddresses: {
        type: [savedAddressSchema],
        default: []
      },
      preferredParking: {
        vehicleType: { type: String, trim: true, default: '4-wheeler' },
        maxHourlyPrice: { type: Number, default: 0 },
        coveredOnly: { type: Boolean, default: false },
        evPreferred: { type: Boolean, default: false }
      }
    },
    ownerProfile: {
      businessName: { type: String, trim: true, default: '' },
      businessType: { type: String, trim: true, default: '' },
      taxId: { type: String, trim: true, default: '' },
      supportEmail: { type: String, trim: true, default: '' },
      supportPhone: { type: String, trim: true, default: '' }
    },
    adminProfile: {
      notificationChannel: { type: String, trim: true, default: 'email' },
      notes: { type: String, trim: true, default: '' }
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
