import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createBookingSchema = z
  .object({
    parking: objectIdSchema,
    vehicleType: z.enum(['2-wheeler', '4-wheeler']),
    bookingDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    slotCount: z.coerce.number().int().positive().max(20)
  })
  .refine((data) => data.startTime < data.endTime, {
    path: ['endTime'],
    message: 'End time must be after start time'
  });
