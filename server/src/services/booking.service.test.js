import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBookingOverlapFilter,
  calculateTotalAmount,
  cancelBooking,
  createBooking,
  getBookingDetail,
  listAllBookings,
  listMyBookings
} from './booking.service.js';

const userId = '507f1f77bcf86cd799439021';
const otherUserId = '507f1f77bcf86cd799439022';
const parkingId = '507f1f77bcf86cd799439023';
const bookingId = '507f1f77bcf86cd799439024';

const bookingInput = {
  parking: parkingId,
  vehicleType: '4-wheeler',
  bookingDate: '2026-05-01',
  startTime: '09:00',
  endTime: '11:00',
  slotCount: 2
};

test('buildBookingOverlapFilter uses time-window conflict logic', () => {
  const filter = buildBookingOverlapFilter(bookingInput);

  assert.equal(filter.parking, parkingId);
  assert.equal(filter.bookingDate, '2026-05-01');
  assert.deepEqual(filter.status, { $in: ['pending', 'confirmed'] });
  assert.deepEqual(filter.startTime, { $lt: '11:00' });
  assert.deepEqual(filter.endTime, { $gt: '09:00' });
});

test('calculateTotalAmount bills rounded-up hours by slot count', () => {
  const amount = calculateTotalAmount(makeParking({ hourlyPrice: 60 }), {
    ...bookingInput,
    startTime: '09:00',
    endTime: '10:30',
    slotCount: 2
  });

  assert.equal(amount, 240);
});

test('successful booking decrements available slots and returns pending unpaid booking', async () => {
  let receivedUpdateFilter;
  const parking = makeParking({ availableSlots: 5, totalSlots: 5, hourlyPrice: 50 });

  const ParkingModel = {
    findOne() {
      return withSession(parking);
    },
    async findOneAndUpdate(filter, update) {
      receivedUpdateFilter = filter;
      parking.availableSlots += update.$inc.availableSlots;
      return parking;
    }
  };

  const BookingModel = {
    aggregate() {
      return withAggregateSession([]);
    },
    async create(payload) {
      return [makeBooking(payload[0])];
    }
  };

  const booking = await createBooking(bookingInput, makeUser(userId), {
    ParkingModel,
    BookingModel,
    runInTransaction: (work) => work(null)
  });

  assert.equal(receivedUpdateFilter.availableSlots.$gte, 2);
  assert.equal(parking.availableSlots, 3);
  assert.equal(booking.status, 'pending');
  assert.equal(booking.paymentStatus, 'pending');
  assert.ok(booking.paymentExpiresAt instanceof Date);
  assert.equal(booking.totalAmount, 200);
});

test('overlapping booking is rejected when requested slots exceed capacity', async () => {
  const ParkingModel = {
    findOne() {
      return withSession(makeParking({ availableSlots: 5, totalSlots: 3 }));
    }
  };

  const BookingModel = {
    aggregate() {
      return withAggregateSession([{ slotCount: 2 }]);
    }
  };

  await assert.rejects(
    () =>
      createBooking(bookingInput, makeUser(userId), {
        ParkingModel,
        BookingModel,
        runInTransaction: (work) => work(null)
      }),
    /time slot is no longer available/
  );
});

test('cancellation restores parking slots', async () => {
  const booking = makeBooking({ ...bookingInput, user: userId, status: 'confirmed', slotCount: 2 });
  let restoredSlots = 0;

  const BookingModel = {
    findById() {
      return withSession(booking);
    }
  };

  const ParkingModel = {
    async findByIdAndUpdate(_id, update) {
      restoredSlots = update.$inc.availableSlots;
    }
  };

  const cancelled = await cancelBooking(bookingId, makeUser(userId), {
    BookingModel,
    ParkingModel,
    runInTransaction: (work) => work(null)
  });

  assert.equal(cancelled.status, 'cancelled');
  assert.equal(restoredSlots, 2);
});

test('unauthorized users cannot access another user booking', async () => {
  const BookingModel = {
    findById() {
      return withSession(makeBooking({ ...bookingInput, user: otherUserId }));
    }
  };

  await assert.rejects(
    () => getBookingDetail(bookingId, makeUser(userId), { BookingModel }),
    /permission/
  );
});

test('booking history retrieval returns user bookings newest first', async () => {
  let receivedFilter;
  let receivedSort;

  const BookingModel = {
    find(filter) {
      receivedFilter = filter;
      return {
        sort(sort) {
          receivedSort = sort;
          return {
            lean: async () => [makeBooking({ ...bookingInput, user: userId })]
          };
        }
      };
    }
  };

  const bookings = await listMyBookings(makeUser(userId), { BookingModel });

  assert.equal(receivedFilter.user.toString(), userId);
  assert.deepEqual(receivedSort, { createdAt: -1, _id: 1 });
  assert.equal(bookings.length, 1);
});

test('admin booking oversight can list all bookings with status filter', async () => {
  let receivedFilter;

  const BookingModel = {
    find(filter) {
      receivedFilter = filter;
      return {
        sort() {
          return {
            lean: async () => [makeBooking({ ...bookingInput, user: userId })]
          };
        }
      };
    }
  };

  const bookings = await listAllBookings({ status: 'confirmed' }, { BookingModel });

  assert.deepEqual(receivedFilter, { status: 'confirmed' });
  assert.equal(bookings.length, 1);
});

function makeUser(id, role = 'driver') {
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
    vehicleTypes: overrides.vehicleTypes ?? ['4-wheeler'],
    hourlyPrice: overrides.hourlyPrice ?? 60,
    totalSlots: overrides.totalSlots ?? 10,
    availableSlots: overrides.availableSlots ?? 10
  };
}

function makeBooking(overrides = {}) {
  return {
    _id: {
      toString: () => bookingId
    },
    user: {
      toString: () => overrides.user?.toString?.() ?? overrides.user ?? userId
    },
    parking: {
      toString: () => overrides.parking?.toString?.() ?? overrides.parking ?? parkingId
    },
    vehicleType: overrides.vehicleType,
    bookingDate: overrides.bookingDate,
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    slotCount: overrides.slotCount,
    totalAmount: overrides.totalAmount ?? 120,
    status: overrides.status ?? 'confirmed',
    paymentStatus: overrides.paymentStatus ?? 'pending',
    isTestPayment: overrides.isTestPayment ?? false,
    paymentExpiresAt: overrides.paymentExpiresAt,
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z'),
    async save() {
      return this;
    }
  };
}

function withSession(value) {
  return {
    async session() {
      return value;
    },
    then(resolve) {
      return Promise.resolve(value).then(resolve);
    }
  };
}

function withAggregateSession(value) {
  return {
    async session() {
      return value;
    },
    then(resolve) {
      return Promise.resolve(value).then(resolve);
    }
  };
}
