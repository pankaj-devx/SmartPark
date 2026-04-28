import mongoose from 'mongoose';
import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';

export function serializeParking(parking) {
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
    coordinates: {
      lng: parking.location.coordinates[0],
      lat: parking.location.coordinates[1]
    },
    totalSlots: parking.totalSlots,
    availableSlots: parking.availableSlots,
    vehicleTypes: parking.vehicleTypes,
    hourlyPrice: parking.hourlyPrice,
    amenities: parking.amenities,
    parkingType: parking.parkingType ?? 'lot',
    isOpen24x7: parking.isOpen24x7 ?? true,
    operatingHours: parking.operatingHours ?? { open: '00:00', close: '23:59' },
    popularityScore: parking.popularityScore ?? 0,
    distance: parking.distance,
    rankingScore: parking.rankingScore,
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
    amenities: input.amenities ?? [],
    parkingType: input.parkingType ?? 'lot',
    isOpen24x7: input.isOpen24x7 ?? true,
    operatingHours: input.operatingHours ?? { open: '00:00', close: '23:59' },
    popularityScore: 0,
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

  return sortMap[sort] ?? sortMap.newest;
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
  const skip = (page - 1) * limit;
  const filter = buildPublicParkingFilter(query);
  const sort = buildParkingSort(query.sort);

  const [parkings, total] = await Promise.all([
    ParkingModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ParkingModel.countDocuments(filter)
  ]);
  const rankedParkings = applyRanking(parkings, query);

  return {
    parkings: rankedParkings.map(serializeParking),
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
  const skip = (page - 1) * limit;
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
        parkings: [{ $skip: skip }, { $limit: limit }],
        metadata: [{ $count: 'total' }]
      }
    }
  ];

  const [result] = await ParkingModel.aggregate(pipeline);
  const parkings = result?.parkings ?? [];
  const total = result?.metadata?.[0]?.total ?? 0;
  const rankedParkings = applyRanking(parkings, { ...query, sort: query.sort ?? 'nearest' });

  return {
    parkings: rankedParkings.map(serializeParking),
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
  const parkings = await ParkingModel.find({ owner: user._id, isActive: true }).sort({ createdAt: -1 }).lean();

  return parkings.map(serializeParking);
}

export async function getParkingDetail(id, user = null, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parking = await findParkingById(ParkingModel, id);

  if (parking.verificationStatus === 'approved' && parking.isActive) {
    return serializeParking(parking);
  }

  if (user && canManageParking(user, parking)) {
    return serializeParking(parking);
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
  await parking.save();

  return serializeParking(parking);
}

async function findParkingById(ParkingModel, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, 'Parking listing not found');
  }

  const parking = await ParkingModel.findById(id);

  if (!parking || !parking.isActive) {
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

function getCurrentTime(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}
