import mongoose from 'mongoose';
import { deleteParkingImage, uploadParkingImage } from '../config/cloudinary.js';
import { Parking } from '../models/parking.model.js';
import { Review } from '../models/review.model.js';
import { computeLiveAvailableSlotsForMany, reconcileExpiredBookings } from './booking.service.js';
import { createHttpError } from '../utils/createHttpError.js';

const MAX_PARKING_IMAGES = 5;
const MAX_PAGINATION_SKIP = 5000;
const WEIGHTS = {
  distance: 0.4,
  price: 0.2,
  rating: 0.25,
  availability: 0.15
};
const PARKING_LIST_PROJECTION = {
  title: 1,
  description: 1,
  address: 1,
  city: 1,
  district: 1,
  area: 1,
  state: 1,
  pincode: 1,
  location: 1,
  totalSlots: 1,
  availableSlots: 1,
  vehicleTypes: 1,
  hourlyPrice: 1,
  pricing: 1,
  amenities: 1,
  parkingType: 1,
  isOpen24x7: 1,
  operatingHours: 1,
  popularityScore: 1,
  images: 1,
  coverImage: 1,
  imageCount: 1,
  owner: 1,
  verificationStatus: 1,
  rejectionReason: 1,
  isActive: 1,
  createdAt: 1,
  updatedAt: 1
};

export function serializeParking(parking) {
  // Extract coordinates from the GeoJSON location field.
  // GeoJSON stores [longitude, latitude] — we expose both the nested
  // `coordinates` object AND flat `latitude`/`longitude` fields so
  // clients can use whichever shape they prefer.
  const lng = parking.location?.coordinates?.[0] ?? null;
  const lat = parking.location?.coordinates?.[1] ?? null;

  return {
    id: parking._id.toString(),
    title: parking.title,
    description: parking.description,
    address: parking.address,
    city: parking.city,
    district: parking.district ?? '',
    area: parking.area ?? '',
    state: parking.state,
    pincode: parking.pincode,
    // Flat convenience fields — easier to use in map libraries
    latitude: lat,
    longitude: lng,
    // Nested object — matches the create/update request shape
    coordinates: {
      lng,
      lat
    },
    totalSlots: parking.totalSlots,
    availableSlots: parking.availableSlots,
    vehicleTypes: parking.vehicleTypes,
    hourlyPrice: parking.hourlyPrice,
    // pricing is a Mongoose Map — convert to a plain object for JSON serialization.
    // Undefined when not set (old listings) — clients fall back to hourlyPrice.
    pricing: parking.pricing ? Object.fromEntries(parking.pricing) : undefined,
    amenities: parking.amenities,
    parkingType: parking.parkingType ?? 'lot',
    isOpen24x7: parking.isOpen24x7 ?? true,
    operatingHours: parking.operatingHours ?? { open: '00:00', close: '23:59' },
    popularityScore: parking.popularityScore ?? 0,
    images: (parking.images ?? []).map(serializeParkingImage),
    coverImage: serializeCoverImage(parking.coverImage),
    imageCount: parking.imageCount ?? parking.images?.length ?? 0,
    distance: parking.distance,
    rankingScore: parking.rankingScore,
    score: parking.score,
    labels: parking.labels ?? [],
    explanation: parking.explanation,
    owner: parking.owner?._id?.toString?.() ?? parking.owner?.toString?.(),
    verificationStatus: parking.verificationStatus,
    rejectionReason: parking.rejectionReason,
    isActive: parking.isActive,
    createdAt: parking.createdAt,
    updatedAt: parking.updatedAt
  };
}

export function buildParkingCreatePayload(input, ownerId) {
  return {
    title: input.title,
    description: input.description,
    address: input.address,
    city: input.city,
    district: input.district ?? '',
    area: input.area ?? '',
    state: input.state,
    pincode: input.pincode,
    location: {
      type: 'Point',
      coordinates: [input.coordinates.lng, input.coordinates.lat]
    },
    totalSlots: input.totalSlots,
    availableSlots: input.totalSlots,
    vehicleTypes: input.vehicleTypes,
    hourlyPrice: input.hourlyPrice,
    pricing: input.pricing ?? undefined,
    amenities: input.amenities ?? [],
    parkingType: input.parkingType ?? 'lot',
    isOpen24x7: input.isOpen24x7 ?? true,
    operatingHours: input.operatingHours ?? { open: '00:00', close: '23:59' },
    popularityScore: 0,
    images: [],
    coverImage: {},
    imageCount: 0,
    owner: ownerId,
    verificationStatus: 'pending',
    isActive: true
  };
}

export function buildPublicParkingFilter(query) {
  const filter = {
    verificationStatus: 'approved',
    isActive: true
  };

  const keyword = query.search ?? query.q;

  if (keyword) {
    filter.$text = { $search: keyword };
  }

  if (query.city) {
    filter.city = new RegExp(`^${escapeRegExp(query.city)}$`, 'i');
  }

  if (query.state) {
    filter.state = new RegExp(`^${escapeRegExp(query.state)}$`, 'i');
  }

  if (query.district) {
    filter.district = new RegExp(`^${escapeRegExp(query.district)}$`, 'i');
  }

  if (query.area) {
    filter.area = new RegExp(`^${escapeRegExp(query.area)}$`, 'i');
  }

  if (query.vehicleType) {
    filter.vehicleTypes = query.vehicleType;
  }

  if (query.amenities?.length) {
    filter.amenities = { $all: query.amenities };
  }

  if (query.parkingType) {
    filter.parkingType = query.parkingType;
  }

  if (query.minPrice || query.maxPrice) {
    filter.hourlyPrice = {};

    if (query.minPrice) {
      filter.hourlyPrice.$gte = query.minPrice;
    }

    if (query.maxPrice) {
      filter.hourlyPrice.$lte = query.maxPrice;
    }
  }

  if (query.availableOnly) {
    filter.availableSlots = { ...(filter.availableSlots ?? {}), $gt: 0 };
  }

  if (query.isOpen24x7 !== undefined) {
    filter.isOpen24x7 = query.isOpen24x7;
  }

  if (query.openNow) {
    const currentTime = getCurrentTime(query.now);
    filter.$or = [
      { isOpen24x7: true },
      {
        'operatingHours.open': { $lte: currentTime },
        'operatingHours.close': { $gte: currentTime }
      }
    ];
  }

  applyAvailabilityPlaceholders(filter, query);

  return filter;
}

export function buildParkingSort(sort) {
  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { hourlyPrice: 1 },
    price_desc: { hourlyPrice: -1 },
    cheapest: { hourlyPrice: 1 },
    highest_availability: { availableSlots: -1 },
    relevance: { createdAt: -1 },
    nearest: { createdAt: -1 }
  };

  return {
    ...(sortMap[sort] ?? sortMap.newest),
    _id: 1
  };
}

export function canManageParking(user, parking) {
  return user.role === 'admin' || parking.owner.toString() === user._id.toString();
}

export async function createParking(input, user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await ParkingModel.create(buildParkingCreatePayload(input, user._id));

  return serializeParking(parking);
}

export async function listPublicParkings(query, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const page = query.page;
  const limit = query.limit;
  const skip = getPaginationSkip(page, limit);
  const filter = buildPublicParkingFilter(query);
  const sort = buildParkingSort(query.sort);

  const [parkings, total] = await Promise.all([
    ParkingModel.find(filter).select(PARKING_LIST_PROJECTION).sort(sort).skip(skip).limit(limit).lean(),
    ParkingModel.countDocuments(filter)
  ]);
  const rankedParkings = applyRanking(parkings, query);

  // Inject live available slot counts so list results reflect current occupancy
  const liveSlots = await computeLiveAvailableSlotsForMany(
    rankedParkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    deps
  );

  const serializedParkings = rankedParkings.map((p) => {
      const serialized = serializeParking(p);
      const live = liveSlots.get(p._id.toString());
      return live !== undefined ? { ...serialized, availableSlots: live } : serialized;
    });

  const reviewedParkings = await enrichParkingsWithReviewStats(serializedParkings, deps);

  return {
    parkings: applySmartRecommendations(reviewedParkings),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function listNearbyParkings(query, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const page = query.page;
  const limit = query.limit;
  const skip = getPaginationSkip(page, limit);
  const radiusMeters = query.radiusKm ? query.radiusKm * 1000 : query.radius;
  const filter = buildPublicParkingFilter({ ...query, lat: undefined, lng: undefined, radius: undefined, radiusKm: undefined });

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [query.lng, query.lat]
        },
        distanceField: 'distance',
        maxDistance: radiusMeters,
        spherical: true,
        query: filter
      }
    },
    {
      $facet: {
        parkings: [{ $sort: { distance: 1, _id: 1 } }, { $skip: skip }, { $limit: limit }, { $project: PARKING_LIST_PROJECTION }],
        metadata: [{ $count: 'total' }]
      }
    }
  ];

  const [result] = await ParkingModel.aggregate(pipeline);
  const parkings = result?.parkings ?? [];
  const total = result?.metadata?.[0]?.total ?? 0;
  const rankedParkings = applyRanking(parkings, { ...query, sort: query.sort ?? 'nearest' });

  // Inject live available slot counts
  const liveSlots = await computeLiveAvailableSlotsForMany(
    rankedParkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    deps
  );

  const serializedParkings = rankedParkings.map((p) => {
      const serialized = serializeParking(p);
      const live = liveSlots.get(p._id.toString());
      return live !== undefined ? { ...serialized, availableSlots: live } : serialized;
    });

  const reviewedParkings = await enrichParkingsWithReviewStats(serializedParkings, deps);

  return {
    parkings: applySmartRecommendations(reviewedParkings),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function listOwnerParkings(user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parkings = await ParkingModel.find({ owner: user._id }).sort({ createdAt: -1 }).lean();

  // Inject live available slot counts so the owner sees current occupancy
  const liveSlots = await computeLiveAvailableSlotsForMany(
    parkings.map((p) => ({ id: p._id, totalSlots: p.totalSlots })),
    deps
  );

  return parkings.map((p) => {
    const serialized = serializeParking(p);
    const live = liveSlots.get(p._id.toString());
    return live !== undefined ? { ...serialized, availableSlots: live } : serialized;
  });
}

export async function getParkingDetail(id, user = null, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  if (parking.verificationStatus === 'approved' && parking.isActive) {
    // Reconcile any expired bookings so availableSlots is accurate before
    // returning. This is the most important read path — it's what the
    // booking form and parking detail page use.
    await reconcileExpiredBookings(parking._id, deps);
    // Re-fetch after reconciliation so the updated availableSlots is returned
    const refreshed = await ParkingModel.findById(parking._id).lean();
    return serializeParking(refreshed ?? parking);
  }

  if (user && canManageParking(user, parking)) {
    await reconcileExpiredBookings(parking._id, deps);
    const refreshed = await ParkingModel.findById(parking._id).lean();
    return serializeParking(refreshed ?? parking);
  }

  throw createHttpError(404, 'Parking listing not found');
}

export async function updateParking(id, input, user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  if (!canManageParking(user, parking)) {
    throw createHttpError(403, 'You can only update your own parking listings');
  }

  const nextTotalSlots = input.totalSlots ?? parking.totalSlots;
  const nextAvailableSlots = input.availableSlots ?? parking.availableSlots;

  if (nextAvailableSlots > nextTotalSlots) {
    throw createHttpError(409, 'Available slots cannot be greater than total slots');
  }

  applyParkingUpdates(parking, input);
  parking.verificationStatus = 'pending';
  parking.rejectionReason = '';

  await parking.save();
  return serializeParking(parking);
}

export async function softDeleteParking(id, user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  if (!canManageParking(user, parking)) {
    throw createHttpError(403, 'You can only delete your own parking listings');
  }

  parking.isActive = false;
  await parking.save();

  return serializeParking(parking);
}

export async function approveParking(id, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  parking.verificationStatus = 'approved';
  parking.rejectionReason = '';
  parking.isActive = true;
  await parking.save();

  return serializeParking(parking);
}

export async function rejectParking(id, reason = '', deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  parking.verificationStatus = 'rejected';
  parking.rejectionReason = reason;
  parking.isActive = false;
  await parking.save();

  return serializeParking(parking);
}

export async function toggleParkingActive(id, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id, { includeInactive: true });

  parking.isActive = !parking.isActive;
  await parking.save();

  return serializeParking(parking);
}

export async function addParkingImages(id, files, user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const uploadImage = deps.uploadParkingImage ?? uploadParkingImage;
  const parking = await findParkingById(ParkingModel, id);

  if (!canManageParking(user, parking)) {
    throw createHttpError(403, 'You can only manage images for your own parking listings');
  }

  if (!files?.length) {
    throw createHttpError(400, 'At least one image is required');
  }

  const existingCount = parking.images?.length ?? 0;

  if (existingCount + files.length > MAX_PARKING_IMAGES) {
    throw createHttpError(409, `A parking listing can have at most ${MAX_PARKING_IMAGES} images`);
  }

  const uploadedImages = await Promise.all(
    files.map(async (file, index) => {
      const uploaded = await uploadImage(file);

      return {
        _id: new mongoose.Types.ObjectId(),
        url: uploaded.url,
        publicId: uploaded.publicId,
        isPrimary: existingCount === 0 && index === 0,
        caption: file.originalname ?? ''
      };
    })
  );

  parking.images.push(...uploadedImages);
  syncParkingImageSummary(parking);
  await parking.save();

  return serializeParking(parking);
}

export async function removeParkingImage(id, imageId, user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const deleteImage = deps.deleteParkingImage ?? deleteParkingImage;
  const parking = await findParkingById(ParkingModel, id);

  if (!canManageParking(user, parking)) {
    throw createHttpError(403, 'You can only manage images for your own parking listings');
  }

  const image = findParkingImage(parking, imageId);

  if (!image) {
    throw createHttpError(404, 'Parking image not found');
  }

  await deleteImage(image.publicId);
  parking.images = parking.images.filter((item) => item._id.toString() !== imageId);

  if (parking.images.length > 0 && !parking.images.some((item) => item.isPrimary)) {
    parking.images[0].isPrimary = true;
  }

  syncParkingImageSummary(parking);
  await parking.save();

  return serializeParking(parking);
}

export async function setPrimaryParkingImage(id, imageId, user, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  if (!canManageParking(user, parking)) {
    throw createHttpError(403, 'You can only manage images for your own parking listings');
  }

  const image = findParkingImage(parking, imageId);

  if (!image) {
    throw createHttpError(404, 'Parking image not found');
  }

  parking.images.forEach((item) => {
    item.isPrimary = item._id.toString() === imageId;
  });
  syncParkingImageSummary(parking);
  await parking.save();

  return serializeParking(parking);
}

async function findParkingById(ParkingModel, id, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Parking listing not found');
  }

  const parking = await ParkingModel.findById(id);

  if (!parking || (!parking.isActive && !options.includeInactive)) {
    throw createHttpError(404, 'Parking listing not found');
  }

  return parking;
}

function applyParkingUpdates(parking, input) {
  const scalarFields = [
    'title',
    'description',
    'address',
    'city',
    'district',
    'area',
    'state',
    'pincode',
    'totalSlots',
    'availableSlots',
    'vehicleTypes',
    'hourlyPrice',
    'pricing',
    'amenities',
    'parkingType',
    'isOpen24x7',
    'operatingHours',
    'isActive'
  ];

  for (const field of scalarFields) {
    if (input[field] !== undefined) {
      parking[field] = input[field];
    }
  }

  if (input.coordinates) {
    parking.location = {
      type: 'Point',
      coordinates: [input.coordinates.lng, input.coordinates.lat]
    };
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPaginationSkip(page, limit) {
  return Math.min((page - 1) * limit, MAX_PAGINATION_SKIP);
}

function applyAvailabilityPlaceholders(filter, query) {
  if (!query.date && !query.startTime && !query.endTime) {
    return filter;
  }

  filter.availableSlots = { ...(filter.availableSlots ?? {}), $gt: 0 };
  return filter;
}

function serializeParkingImage(image) {
  return {
    id: image._id?.toString?.() ?? image.id,
    url: image.url,
    publicId: image.publicId,
    isPrimary: image.isPrimary,
    caption: image.caption ?? ''
  };
}

function serializeCoverImage(coverImage) {
  if (!coverImage?.url) {
    return null;
  }

  return {
    id: coverImage.imageId?.toString?.() ?? coverImage.imageId,
    url: coverImage.url,
    publicId: coverImage.publicId,
    caption: coverImage.caption ?? ''
  };
}

function findParkingImage(parking, imageId) {
  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return null;
  }

  return parking.images.find((image) => image._id.toString() === imageId);
}

function syncParkingImageSummary(parking) {
  parking.imageCount = parking.images.length;

  if (parking.images.length === 0) {
    parking.coverImage = {};
    return;
  }

  let primaryImage = parking.images.find((image) => image.isPrimary);

  if (!primaryImage) {
    primaryImage = parking.images[0];
    primaryImage.isPrimary = true;
  }

  parking.images.forEach((image) => {
    image.isPrimary = image._id.toString() === primaryImage._id.toString();
  });

  parking.coverImage = {
    imageId: primaryImage._id,
    url: primaryImage.url,
    publicId: primaryImage.publicId,
    caption: primaryImage.caption ?? ''
  };
}

function applyRanking(parkings, query = {}) {
  const scoredParkings = parkings.map((parking) => ({
    ...parking,
    rankingScore: calculateRankingScore(parking)
  }));

  if (query.sort === 'nearest') {
    return scoredParkings.sort((a, b) => (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER));
  }

  if (query.sort === 'cheapest' || query.sort === 'price_asc') {
    return scoredParkings.sort((a, b) => a.hourlyPrice - b.hourlyPrice || b.rankingScore - a.rankingScore);
  }

  if (query.sort === 'highest_availability') {
    return scoredParkings.sort((a, b) => b.availableSlots - a.availableSlots || b.rankingScore - a.rankingScore);
  }

  if (query.sort === 'relevance') {
    return scoredParkings.sort((a, b) => b.rankingScore - a.rankingScore);
  }

  return scoredParkings;
}

function calculateRankingScore(parking) {
  const distanceScore = parking.distance === undefined ? 0 : Math.max(0, 1 - parking.distance / 10000) * 35;
  const priceScore = Math.max(0, 1 - parking.hourlyPrice / 500) * 25;
  const availabilityRatio = parking.totalSlots ? parking.availableSlots / parking.totalSlots : 0;
  const availabilityScore = availabilityRatio * 25;
  const popularityScore = Math.min(parking.popularityScore ?? 0, 100) * 0.15;

  return Number((distanceScore + priceScore + availabilityScore + popularityScore).toFixed(2));
}

function normalize(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 0;
  }

  return (value - min) / (max - min);
}

function safeNumber(val, fallback = 0) {
  const fallbackNumber = Number.isFinite(fallback) ? fallback : 0;
  return Number.isFinite(val) ? val : fallbackNumber;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, safeNumber(value, 0)));
}

function computeParkingScore(parking, context) {
  const maxDistance = Math.max(1, safeNumber(context.maxDistance, 1));
  const maxPrice = Math.max(1, safeNumber(context.maxPrice, 1));

  const distance = Math.max(0, safeNumber(parking.distance, maxDistance));
  const price = Math.max(0, safeNumber(parking.pricePerHour ?? parking.hourlyPrice, maxPrice));
  const rating = Math.max(0, Math.min(5, safeNumber(parking.averageRating, 0)));
  const totalSlots = Math.max(0, safeNumber(parking.totalSlots, 0));
  const availableSlots = Math.max(0, safeNumber(parking.availableSlots, 0));

  const distanceScore = 1 - clamp01(normalize(distance, 0, maxDistance));
  const priceScore = 1 - clamp01(normalize(price, 0, maxPrice));
  const ratingScore = clamp01(rating / 5);
  const availabilityScore = totalSlots > 0 ? clamp01(availableSlots / totalSlots) : 0;

  const score =
    WEIGHTS.distance * distanceScore +
    WEIGHTS.price * priceScore +
    WEIGHTS.rating * ratingScore +
    WEIGHTS.availability * availabilityScore;

  return Number(clamp01(score).toFixed(3));
}

function addLabels(parking) {
  const labels = [];

  if ((parking.averageRating || 0) >= 4.5) {
    labels.push('Top Rated');
  }

  if (parking.score >= 0.7) {
    labels.push('Recommended');
  }

  if ((parking.pricePerHour ?? parking.hourlyPrice ?? 0) < 50) {
    labels.push('Best Value');
  }

  if ((parking.availableSlots || 0) <= 2) {
    labels.push('Filling Fast');
  }

  return labels;
}

function generateExplanation(parking) {
  const reasons = [];
  const distanceKm = getDistanceInKm(parking.distance);
  const averageRating = safeNumber(parking.averageRating, 0);
  const pricePerHour = safeNumber(parking.pricePerHour ?? parking.hourlyPrice, Number.MAX_SAFE_INTEGER);
  const availableSlots = safeNumber(parking.availableSlots, 0);

  if (distanceKm < 1) {
    reasons.push('very close to your location');
  }

  if (averageRating >= 4.5) {
    reasons.push('highly rated by users');
  }

  if (pricePerHour < 50) {
    reasons.push('affordable pricing');
  }

  if (availableSlots > 5) {
    reasons.push('good availability');
  }

  return reasons.length > 0
    ? reasons.join(', ')
    : 'balanced option';
}

function getDistanceInKm(distance) {
  const safeDistance = Math.max(0, safeNumber(distance, Number.MAX_SAFE_INTEGER));
  return safeDistance > 50 ? safeDistance / 1000 : safeDistance;
}

function applySmartRecommendations(parkings) {
  if (!parkings.length) {
    return [];
  }

  const distances = parkings.map((p) => Math.max(0, safeNumber(p.distance, 0)));
  const prices = parkings.map((p) => Math.max(0, safeNumber(p.pricePerHour ?? p.hourlyPrice, 0)));

  const maxDistance = Math.max(...distances, 1);
  const maxPrice = Math.max(...prices, 1);

  const context = { maxDistance, maxPrice };

  const scoredParkings = parkings.map((p) => {
    const score = computeParkingScore(p, context);
    const scoredParking = {
      ...p,
      score
    };

    return {
      ...scoredParking,
      labels: addLabels(scoredParking),
      explanation: generateExplanation(scoredParking)
    };
  });

  return scoredParkings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.averageRating || 0) !== (a.averageRating || 0)) {
      return (b.averageRating || 0) - (a.averageRating || 0);
    }
    return (a.distance || 0) - (b.distance || 0);
  });
}

async function enrichParkingsWithReviewStats(parkings, deps = {}) {
  if (!parkings.length) {
    return [];
  }

  const ReviewModel = deps.ReviewModel ?? Review;
  const parkingIds = parkings.map((parking) => new mongoose.Types.ObjectId(parking.id));
  const stats = await ReviewModel.aggregate([
    { $match: { parking: { $in: parkingIds } } },
    {
      $group: {
        _id: '$parking',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const statsMap = new Map(
    stats.map((item) => [
      item._id.toString(),
      {
        averageRating: item.averageRating ? Number(item.averageRating.toFixed(1)) : 0,
        totalReviews: item.totalReviews ?? 0
      }
    ])
  );

  return parkings.map((parking) => ({
    ...parking,
    ...(statsMap.get(parking.id) ?? { averageRating: 0, totalReviews: 0 })
  }));
}

function getCurrentTime(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

// ---------------------------------------------------------------------------
// Phase 7C — Smart Recommendations
// ---------------------------------------------------------------------------

/**
 * Return top smart parking recommendations near a coordinate.
 *
 * Scoring formula (lower = better):
 *   smartScore = (distanceKm * 0.5) + (hourlyPrice * 0.3) - (availableSlots * 0.2)
 *
 * Badges are assigned after sorting:
 *   "Best Choice"  → lowest smartScore overall
 *   "Closest"      → smallest distance
 *   "Cheapest"     → lowest hourlyPrice
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {number} limit     - max results to return (3–5)
 * @param {object} deps      - injectable deps for testing
 */
export async function listSmartParkings(lat, lng, radiusKm = 3, limit = 5, deps = {}) {
  // Re-use the existing nearby query — no new DB logic needed
  const nearby = await listNearbyParkings(
    { lat, lng, radiusKm, radius: radiusKm * 1000, page: 1, limit: 20, sort: 'nearest' },
    deps
  );

  const parkings = nearby.parkings;

  if (!parkings.length) {
    return [];
  }

  // Compute smart score for each parking
  const scored = parkings.map((p) => {
    const distanceKm = (p.distance ?? 0) / 1000;
    const smartScore =
      distanceKm * 0.5 + p.hourlyPrice * 0.3 - p.availableSlots * 0.2;

    return { ...p, smartScore: Number(smartScore.toFixed(4)) };
  });

  // Sort ascending — lowest score is "best"
  scored.sort((a, b) => a.smartScore - b.smartScore);

  // Assign badges (one per category, no duplicates)
  const top = scored.slice(0, limit);

  const bestOverall = top[0];
  const closest = [...top].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))[0];
  const cheapest = [...top].sort((a, b) => a.hourlyPrice - b.hourlyPrice)[0];

  const badgeMap = new Map();
  // Priority: Best Choice > Closest > Cheapest
  badgeMap.set(cheapest.id, 'Cheapest');
  badgeMap.set(closest.id, 'Closest');
  badgeMap.set(bestOverall.id, 'Best Choice'); // overwrites if same parking

  return top.map((p) => ({
    ...p,
    badge: badgeMap.get(p.id) ?? null
  }));
}
