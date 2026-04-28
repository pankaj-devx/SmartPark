import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveParking,
  buildParkingCreatePayload,
  buildPublicParkingFilter,
  createParking,
  listPublicParkings,
  updateParking
} from './parking.service.js';

const ownerId = '507f1f77bcf86cd799439011';
const otherOwnerId = '507f1f77bcf86cd799439012';
const parkingId = '507f1f77bcf86cd799439013';

const validInput = {
  title: 'Station Parking',
  description: 'Secure parking near the main station',
  address: 'MG Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  coordinates: {
    lat: 18.5204,
    lng: 73.8567
  },
  totalSlots: 10,
  vehicleTypes: ['4-wheeler'],
  hourlyPrice: 60,
  amenities: ['covered', 'cctv']
};

test('buildParkingCreatePayload defaults owner listing to pending with available slots', () => {
  const payload = buildParkingCreatePayload(validInput, ownerId);

  assert.equal(payload.owner, ownerId);
  assert.equal(payload.verificationStatus, 'pending');
  assert.equal(payload.availableSlots, validInput.totalSlots);
  assert.deepEqual(payload.location.coordinates, [73.8567, 18.5204]);
});

test('owner create listing returns serialized pending parking', async () => {
  const ParkingModel = {
    async create(payload) {
      return makeParking(payload);
    }
  };

  const parking = await createParking(validInput, makeUser('owner', ownerId), { ParkingModel });

  assert.equal(parking.title, validInput.title);
  assert.equal(parking.verificationStatus, 'pending');
  assert.equal(parking.availableSlots, 10);
});

test('buildPublicParkingFilter exposes only approved and active listings', () => {
  const filter = buildPublicParkingFilter({
    search: 'station',
    city: 'Pune',
    vehicleType: '4-wheeler',
    minPrice: 20,
    maxPrice: 100
  });

  assert.equal(filter.verificationStatus, 'approved');
  assert.equal(filter.isActive, true);
  assert.deepEqual(filter.$text, { $search: 'station' });
  assert.equal(filter.vehicleTypes, '4-wheeler');
  assert.deepEqual(filter.hourlyPrice, { $gte: 20, $lte: 100 });
});

test('public list returns only approved listing query results', async () => {
  let receivedFilter;

  const ParkingModel = {
    find(filter) {
      receivedFilter = filter;
      return {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return {
            lean: async () => [makeParking({ ...buildParkingCreatePayload(validInput, ownerId), verificationStatus: 'approved' })]
          };
        }
      };
    },
    async countDocuments() {
      return 1;
    }
  };

  const result = await listPublicParkings({ page: 1, limit: 10, sort: 'newest' }, { ParkingModel });

  assert.equal(receivedFilter.verificationStatus, 'approved');
  assert.equal(receivedFilter.isActive, true);
  assert.equal(result.parkings.length, 1);
  assert.equal(result.pagination.total, 1);
});

test('owner can update own listing and listing returns to pending review', async () => {
  const document = makeParking(buildParkingCreatePayload(validInput, ownerId));
  document.verificationStatus = 'approved';

  const ParkingModel = {
    async findById() {
      return document;
    }
  };

  const updated = await updateParking(parkingId, { hourlyPrice: 75 }, makeUser('owner', ownerId), { ParkingModel });

  assert.equal(updated.hourlyPrice, 75);
  assert.equal(updated.verificationStatus, 'pending');
});

test('owner cannot update another owner listing', async () => {
  const ParkingModel = {
    async findById() {
      return makeParking(buildParkingCreatePayload(validInput, otherOwnerId));
    }
  };

  await assert.rejects(
    () => updateParking(parkingId, { hourlyPrice: 75 }, makeUser('owner', ownerId), { ParkingModel }),
    /own parking listings/
  );
});

test('admin approval marks listing approved and active', async () => {
  const document = makeParking(buildParkingCreatePayload(validInput, ownerId));

  const ParkingModel = {
    async findById() {
      return document;
    }
  };

  const approved = await approveParking(parkingId, { ParkingModel });

  assert.equal(approved.verificationStatus, 'approved');
  assert.equal(approved.isActive, true);
});

function makeUser(role, id) {
  return {
    _id: {
      toString: () => id
    },
    role
  };
}

function makeParking(overrides = {}) {
  return {
    _id: {
      toString: () => parkingId
    },
    title: overrides.title,
    description: overrides.description,
    address: overrides.address,
    city: overrides.city,
    state: overrides.state,
    pincode: overrides.pincode,
    location: overrides.location,
    totalSlots: overrides.totalSlots,
    availableSlots: overrides.availableSlots,
    vehicleTypes: overrides.vehicleTypes,
    hourlyPrice: overrides.hourlyPrice,
    amenities: overrides.amenities,
    owner: {
      toString: () => overrides.owner
    },
    verificationStatus: overrides.verificationStatus,
    rejectionReason: overrides.rejectionReason ?? '',
    isActive: overrides.isActive,
    createdAt: new Date('2026-04-27T00:00:00.000Z'),
    updatedAt: new Date('2026-04-27T00:00:00.000Z'),
    async save() {
      return this;
    }
  };
}

