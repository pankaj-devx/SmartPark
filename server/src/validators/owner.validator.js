import { z } from 'zod';

export const ownerBookingQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  parking: z.string().regex(/^[a-f\d]{24}$/i).optional()
});
