import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking ID format');

export const createPaymentOrderSchema = z.object({
  bookingId: objectIdSchema,
  coupon: z.string().trim().max(50).optional()
});

export const verifyPaymentSchema = z.object({
  bookingId: objectIdSchema,
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});
