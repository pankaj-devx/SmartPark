import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveParking,
  buildParkingCreatePayload,
  buildParkingSort,
  buildPublicParkingFilter,
  createParking,
  listNearbyParkings,
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
    amenities: ['covered', 'cctv'],
    availableOnly: true,
    parkingType: 'covered',
    minPrice: 20,
    maxPrice: 100
  });

  assert.equal(filter.verificationStatus, 'approved');
  assert.equal(filter.isActive, true);
  assert.deepEqual(filter.$text, { $search: 'station' });
  assert.equal(filter.vehicleTypes, '4-wheeler');
  assert.deepEqual(filter.amenities, { $all: ['covered', 'cctv'] });
  assert.deepEqual(filter.availableSlots, { $gt: 0 });
  assert.equal(filter.parkingType, 'covered');
  assert.deepEqual(filter.hourlyPrice, { $gte: 20, $lte: 100 });
});

test('buildPublicParkingFilter composes location and open-now filters', () => {
  const filter = buildPublicParkingFilter({
    q: 'central',
    state: 'Maharashtra',
    district: 'Pune',
    area: 'Camp',
    openNow: true,
    now: new Date('2026-04-27T10:30:00')
  });

  assert.deepEqual(filter.$text, { $search: 'central' });
  assert.match(filter.state.source, /Maharashtra/);
  assert.match(filter.district.source, /Pune/);
  assert.match(filter.area.source, /Camp/);
  assert.equal(filter.$or[0].isOpen24x7, true);
  assert.deepEqual(filter.$or[1]['operatingHours.open'], { $lte: '10:30' });
  assert.deepEqual(filter.$or[1]['operatingHours.close'], { $gte: '10:30' });
});

test('buildParkingSort supports discovery sorting modes', () => {
  assert.deepEqual(buildParkingSort('cheapest'), { hourlyPrice: 1 });
  assert.deepEqual(buildParkingSort('highest_availability'), { availableSlots: -1 });
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

test('nearby search uses geoNear, returns distance, and keeps approved visibility', async () => {
  let receivedPipeline;

  const ParkingModel = {
    async aggregate(pipeline) {
      receivedPipeline = pipeline;
      return [
        {
          parkings: [
            makeParking({
              ...buildParkingCreatePayload(validInput, ownerId),
              verificationStatus: 'approved',
              distance: 120
            })
          ],
          metadata: [{ total: 1 }]
        }
      ];
    }
  };

  const result = await listNearbyParkings(
    {
      lat: 18.5204,
      lng: 73.8567,
      radius: 1000,
      page: 1,
      limit: 10,
      sort: 'nearest'
    },
    { ParkingModel }
  );

  assert.equal(receivedPipeline[0].$geoNear.distanceField, 'distance');
  assert.deepEqual(receivedPipeline[0].$geoNear.near.coordinates, [73.8567, 18.5204]);
  assert.equal(receivedPipeline[0].$geoNear.query.verificationStatus, 'approved');
  assert.equal(receivedPipeline[0].$geoNear.query.isActive, true);
  assert.equal(result.parkings[0].distance, 120);
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
    district: overrides.district ?? '',
    area: overrides.area ?? '',
    state: overrides.state,
    pincode: overrides.pincode,
    location: overrides.location,
    totalSlots: overrides.totalSlots,
    availableSlots: overrides.availableSlots,
    vehicleTypes: overrides.vehicleTypes,
    hourlyPrice: overrides.hourlyPrice,
    amenities: overrides.amenities,
    parkingType: overrides.parkingType ?? 'lot',
    isOpen24x7: overrides.isOpen24x7 ?? true,
    operatingHours: overrides.operatingHours ?? { open: '00:00', close: '23:59' },
    popularityScore: overrides.popularityScore ?? 0,
    distance: overrides.distance,
    rankingScore: overrides.rankingScore,
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
