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

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.city) {
    filter.city = new RegExp(`^${escapeRegExp(query.city)}$`, 'i');
  }

  if (query.state) {
    filter.state = new RegExp(`^${escapeRegExp(query.state)}$`, 'i');
  }

  if (query.vehicleType) {
    filter.vehicleTypes = query.vehicleType;
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

  return filter;
}

export function buildParkingSort(sort) {
  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { hourlyPrice: 1 },
    price_desc: { hourlyPrice: -1 }
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

  return {
    parkings: parkings.map(serializeParking),
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
    'state',
    'pincode',
    'totalSlots',
    'availableSlots',
    'vehicleTypes',
    'hourlyPrice',
    'amenities',
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

