import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

const trimmedString = (max) => z.string().trim().max(max);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email().toLowerCase(),
  password: passwordSchema,
  role: z.enum(['driver', 'owner']).default('driver'),
  phone: z.string().trim().max(20).optional()
});

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email().toLowerCase(),
  phone: z.string().trim().max(20).optional().default(''),
  profilePhotoUrl: z.string().trim().max(200000).optional().default(''),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    marketingEmails: z.boolean().default(false),
    compactMode: z.boolean().default(false)
  }),
  driverProfile: z.object({
    vehicleDetails: z.array(
      z.object({
        label: trimmedString(40).default(''),
        registrationNumber: trimmedString(24).default(''),
        vehicleType: z.enum(['2-wheeler', '4-wheeler']).default('4-wheeler'),
        color: trimmedString(24).default('')
      })
    ).max(3).default([]),
    savedAddresses: z.array(
      z.object({
        label: trimmedString(40).default(''),
        address: trimmedString(160).default('')
      })
    ).max(3).default([]),
    preferredParking: z.object({
      vehicleType: z.enum(['2-wheeler', '4-wheeler']).default('4-wheeler'),
      maxHourlyPrice: z.number().min(0).max(10000).default(0),
      coveredOnly: z.boolean().default(false),
      evPreferred: z.boolean().default(false)
    })
  }).optional(),
  ownerProfile: z.object({
    businessName: trimmedString(80).default(''),
    businessType: trimmedString(60).default(''),
    taxId: trimmedString(40).default(''),
    supportEmail: z.union([z.literal(''), z.email().toLowerCase()]).default(''),
    supportPhone: trimmedString(20).default('')
  }).optional(),
  adminProfile: z.object({
    notificationChannel: z.enum(['email', 'slack', 'sms']).default('email'),
    notes: trimmedString(240).default('')
  }).optional()
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
});
