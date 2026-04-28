import mongoose from 'mongoose';

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

