import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createReviewSchema = z.object({
  bookingId: objectIdSchema,
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().trim().max(1000, 'Comment must be at most 1000 characters').optional().default('')
});

export const reviewIdParamSchema = z.object({
  id: objectIdSchema
});

export const parkingIdParamSchema = z.object({
  parkingId: objectIdSchema
});
