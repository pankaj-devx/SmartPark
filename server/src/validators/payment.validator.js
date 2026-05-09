import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid booking ID format');

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createPaymentOrderSchema = z
  .object({
    parking: objectIdSchema,
    vehicleType: z.enum(['2-wheeler', '4-wheeler']),
    bookingDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    slotCount: z.coerce.number().int().positive().max(20),
    coupon: z.string().trim().max(50).nullable().optional().transform(v => v ?? '')
  })
  .refine((data) => data.startTime < data.endTime, {
    path: ['endTime'],
    message: 'End time must be after start time'
  });

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});