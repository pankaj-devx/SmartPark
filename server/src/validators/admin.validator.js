import { z } from 'zod';

export const adminRejectParkingSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const adminBookingQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  parking: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  user: z.string().regex(/^[a-f\d]{24}$/i).optional()
});

export const adminUserIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID format')
});

export const adminParkingIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid parking ID format')
});

export const adminBookingIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking ID format')
});
