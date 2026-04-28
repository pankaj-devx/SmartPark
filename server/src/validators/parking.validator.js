import { z } from 'zod';

const vehicleTypeSchema = z.enum(['2-wheeler', '4-wheeler']);
const amenitySchema = z.enum(['covered', 'cctv', 'ev charging', 'security', 'valet', 'accessible']);

const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

const parkingBaseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(4).max(12),
  coordinates: coordinatesSchema,
  totalSlots: z.coerce.number().int().positive(),
  vehicleTypes: z.array(vehicleTypeSchema).min(1),
  hourlyPrice: z.coerce.number().positive(),
  amenities: z.array(amenitySchema).default([])
});

export const createParkingSchema = parkingBaseSchema;

export const updateParkingSchema = parkingBaseSchema
  .partial()
  .extend({
    availableSlots: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  });

export const rejectParkingSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional()
});

export const listParkingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  vehicleType: vehicleTypeSchema.optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest')
});

