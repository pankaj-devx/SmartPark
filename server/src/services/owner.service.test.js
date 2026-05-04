import test from 'node:test';
import assert from 'node:assert/strict';
import { completeOwnerBooking, getOwnerBookings } from './owner.service.js';

const ownerId = '507f1f77bcf86cd799439041';
const parkingId = '507f1f77bcf86cd799439043';
const otherParkingId = '507f1f77bcf86cd799439044';
const bookingId = '507f1f77bcf86cd799439045';

test('owner only sees bookings for own parking listings', async () => {
  let receivedFilter;
  const ParkingModel = makeParkingModel([makeParking({ id: parkingId, owner: ownerId })]);
  const BookingModel = {
    async aggregate() {
      return [];
    },
    find(filter) {
      receivedFilter = filter;
      return sortableLean([makeBooking({ parking: parkingId })]);
    }
  };

  const result = await getOwnerBookings(makeUser(ownerId), {}, { ParkingModel, BookingModel });

  assert.deepEqual(receivedFilter.parking.$in, [parkingId]);
  assert.equal(result.bookings.length, 1);
});

test('owner cannot filter bookings for another owner parking', async () => {
  const ParkingModel = makeParkingModel([makeParking({ id: parkingId, owner: ownerId })]);

  await assert.rejects(
    () => getOwnerBookings(makeUser(ownerId), { parking: otherParkingId }, { ParkingModel }),
    /own parking listings/
  );
});

test('owner operations summary calculates occupancy and earnings', async () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const ParkingModel = makeParkingModel([makeParking({ id: parkingId, totalSlots: 10, owner: ownerId })]);
  const BookingModel = {
    async aggregate() {
      return [{ _id: parkingId, occupiedSlots: 3 }];
    },
    find() {
      return sortableLean([
        makeBooking({
          parking: parkingId,
          bookingDate: today,
          startTime: '00:00',
          endTime: '23:59',
          slotCount: 3,
          totalAmount: 300,
          status: 'confirmed'
        }),
        makeBooking({ parking: parkingId, status: 'completed', totalAmount: 200 })
      ]);
    }
  };

  const result = await getOwnerBookings(makeUser(ownerId), {}, { ParkingModel, BookingModel });

  assert.equal(result.summary.occupiedSlotsNow, 3);
  assert.equal(result.summary.availableSlotsNow, 7);
  assert.equal(result.summary.estimatedRevenue, 500);
  assert.equal(result.summary.perListingEarnings[0].estimatedRevenue, 500);
});

test('owner can mark own active booking completed and slots restore', async () => {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const booking = makeBooking({ parking: parkingId, bookingDate: futureDate, endTime: '23:59', status: 'confirmed', slotCount: 2 });
  let restoredSlots = 0;
  const BookingModel = {
    async findById() {
      return booking;
    }
  };
  const ParkingModel = {
    async findOne(filter) {
      assert.equal(filter.owner.toString(), ownerId);
      return makeParking({ id: parkingId, owner: ownerId });
    },
    async findByIdAndUpdate(_id, update) {
      restoredSlots = update.$inc.availableSlots;
    },
    async updateOne() {
      return {};
    }
  };

  const completed = await completeOwnerBooking(bookingId, makeUser(ownerId), { BookingModel, ParkingModel });

  assert.equal(completed.status, 'completed');
  assert.equal(restoredSlots, 2);
});

test('owner cannot complete another owner booking', async () => {
  const BookingModel = {
    async findById() {
      return makeBooking({ parking: otherParkingId, status: 'confirmed' });
    }
  };
  const ParkingModel = {
    async findOne() {
      return null;
    }
  };

  await assert.rejects(
    () => completeOwnerBooking(bookingId, makeUser(ownerId), { BookingModel, ParkingModel }),
    /own parking listings/
  );
});

function makeUser(id) {
  return {
    _id: {
      toString: () => id
    },
    role: 'owner'
  };
}

function makeParkingModel(parkings) {
  return {
    find(filter) {
      return sortableLean(parkings.filter((parking) => parking.owner.toString() === filter.owner.toString()));
    }
  };
}

function sortableLean(rows) {
  return {
    sort() {
      return {
        lean: async () => rows
      };
    }
  };
}

function makeParking(overrides = {}) {
  const id = overrides.id ?? parkingId;

  return {
    _id: {
      toString: () => id
    },
    id,
    title: 'Station Parking',
    description: 'Secure parking',
    address: 'MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    location: {
      coordinates: [73.8567, 18.5204]
    },
    totalSlots: overrides.totalSlots ?? 10,
    availableSlots: overrides.availableSlots ?? 8,
    vehicleTypes: ['4-wheeler'],
    hourlyPrice: 60,
    amenities: [],
    owner: {
      toString: () => overrides.owner ?? ownerId
    },
    verificationStatus: 'approved',
    rejectionReason: '',
    isActive: true,
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z')
  };
}

function makeBooking(overrides = {}) {
  return {
    _id: {
      toString: () => bookingId
    },
    user: {
      toString: () => '507f1f77bcf86cd799439046'
    },
    parking: {
      toString: () => overrides.parking ?? parkingId
    },
    vehicleType: '4-wheeler',
    bookingDate: overrides.bookingDate ?? '2026-05-01',
    startTime: overrides.startTime ?? '09:00',
    endTime: overrides.endTime ?? '11:00',
    slotCount: overrides.slotCount ?? 1,
    totalAmount: overrides.totalAmount ?? 120,
    status: overrides.status ?? 'confirmed',
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z'),
    async save() {
      return this;
    }
  };
}
