import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

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

