import { z } from 'zod';

const vehicleTypeSchema = z.enum(['2-wheeler', '4-wheeler']);
const amenitySchema = z.enum(['covered', 'cctv', 'ev charging', 'security', 'valet', 'accessible']);
const parkingTypeSchema = z.enum(['open', 'covered', 'basement', 'garage', 'street', 'lot']);
const sortSchema = z.enum([
  'newest',
  'price_asc',
  'price_desc',
  'nearest',
  'cheapest',
  'highest_availability',
  'relevance'
]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

const parkingBaseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().default(''),
  area: z.string().trim().max(120).optional().default(''),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(4).max(12),
  coordinates: coordinatesSchema,
  totalSlots: z.coerce.number().int().positive(),
  vehicleTypes: z.array(vehicleTypeSchema).min(1),
  hourlyPrice: z.coerce.number().positive(),
  amenities: z.array(amenitySchema).default([]),
  parkingType: parkingTypeSchema.optional().default('lot'),
  isOpen24x7: z.coerce.boolean().optional().default(true),
  operatingHours: z
    .object({
      open: timeSchema.default('00:00'),
      close: timeSchema.default('23:59')
    })
    .optional()
    .default({ open: '00:00', close: '23:59' })
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
  q: z.string().trim().optional(),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  area: z.string().trim().optional(),
  state: z.string().trim().optional(),
  vehicleType: vehicleTypeSchema.optional(),
  amenities: z.preprocess(splitCsv, z.array(amenitySchema).optional()),
  parkingType: parkingTypeSchema.optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  availableOnly: z.coerce.boolean().optional(),
  openNow: z.coerce.boolean().optional(),
  isOpen24x7: z.coerce.boolean().optional(),
  approvedOnly: z.coerce.boolean().optional().default(true),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sort: sortSchema.default('newest')
});

export const nearbyParkingQuerySchema = listParkingQuerySchema.extend({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100000).default(5000),
  radiusKm: z.coerce.number().positive().max(100).optional(),
  sort: sortSchema.default('nearest')
});

export const searchSuggestionsQuerySchema = z.object({
  q: z.string().trim().default('')
});

function splitCsv(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
