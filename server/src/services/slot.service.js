import { Parking } from '../models/parking.model.js';
import { createHttpError } from '../utils/createHttpError.js';

export function getOccupiedSlots(parking) {
  return Math.max(
    0,
    (parking.totalSlots ?? 0) - (parking.availableSlots ?? 0)
  );
}

export async function decreaseAvailableSlots(
  parkingId,
  slotCount = 1,
  deps = {}
) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const session = deps.session;

  assertSlotCount(slotCount);

  const query = ParkingModel.findOneAndUpdate(
    {
      _id: parkingId,
      verificationStatus: 'approved',
      isActive: true,
      availableSlots: { $gte: slotCount }
    },
    {
      $inc: { availableSlots: -slotCount }
    },
    {
      new: true,
      session,
      runValidators: true
    }
  );

  const parking =
    session && typeof query.session === 'function'
      ? await query.session(session)
      : await query;

  if (!parking) {
    throw createHttpError(409, 'Not enough parking slots available');
  }

  await clampAvailableSlots(parkingId, { ParkingModel, session });

  console.log('Available Slots:', parking.availableSlots);

  return parking;
}

export async function increaseAvailableSlots(
  parkingId,
  slotCount = 1,
  deps = {}
) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const session = deps.session;

  assertSlotCount(slotCount);

  const parking = await ParkingModel.findByIdAndUpdate(
    parkingId,
    {
      $inc: { availableSlots: slotCount }
    },
    {
      new: true,
      session,
      runValidators: true
    }
  );

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }

  await clampAvailableSlots(parkingId, { ParkingModel, session });

  const clampedParking = await findParkingById(
    ParkingModel,
    parkingId,
    session
  );

  console.log('Available Slots:', clampedParking.availableSlots);

  return clampedParking;
}

export async function clampAvailableSlots(
  parkingId,
  deps = {}
) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const session = deps.session;

  const parking = await findParkingById(
    ParkingModel,
    parkingId,
    session
  );

  const clampedValue = Math.max(
    0,
    Math.min(parking.availableSlots, parking.totalSlots)
  );

  parking.availableSlots = clampedValue;

  await parking.save({ session });

  return parking;
}

export function assertValidSlotState(parking) {
  if (parking.availableSlots < 0) {
    throw createHttpError(
      409,
      'Available slots cannot be below zero'
    );
  }

  if (parking.availableSlots > parking.totalSlots) {
    throw createHttpError(
      409,
      'Available slots cannot be greater than total slots'
    );
  }
}

function assertSlotCount(slotCount) {
  if (
    !Number.isInteger(Number(slotCount)) ||
    Number(slotCount) < 1
  ) {
    throw createHttpError(
      400,
      'Slot count must be at least 1'
    );
  }
}

async function findParkingById(
  ParkingModel,
  parkingId,
  session
) {
  const query = ParkingModel.findById(parkingId);

  const parking =
    session && typeof query.session === 'function'
      ? await query.session(session)
      : await query;

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }

  return parking;
}