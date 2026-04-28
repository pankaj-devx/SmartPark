import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdminDashboard,
  listAdminBookings,
  listAdminParkings,
  toggleAdminParkingActive
} from './admin.service.js';

const parkingId = '507f1f77bcf86cd799439031';
const bookingId = '507f1f77bcf86cd799439032';

test('admin dashboard returns moderation summaries and grouped parkings', async () => {
  const ParkingModel = {
    async countDocuments(filter) {
      if (filter.verificationStatus === 'pending') return 2;
      if (filter.verificationStatus === 'approved') return 3;
      if (filter.verificationStatus === 'rejected') return 1;
      return 0;
    },
    find() {
      return sortableLean([
        makeParking({ verificationStatus: 'pending' }),
        makeParking({ verificationStatus: 'approved' }),
        makeParking({ verificationStatus: 'rejected' })
      ]);
    }
  };
  const BookingModel = {
    async countDocuments() {
      return 4;
    }
  };
  const UserModel = {
    async countDocuments() {
      return 5;
    }
  };

  const dashboard = await getAdminDashboard({ ParkingModel, BookingModel, UserModel });

  assert.equal(dashboard.summary.pendingApprovals, 2);
  assert.equal(dashboard.summary.totalBookings, 4);
  assert.equal(dashboard.summary.totalUsers, 5);
  assert.equal(dashboard.parkings.pending.length, 1);
  assert.equal(dashboard.parkings.approved.length, 1);
  assert.equal(dashboard.parkings.rejected.length, 1);
});

test('admin parkings are grouped by verification status', async () => {
  const ParkingModel = {
    find() {
      return sortableLean([
        makeParking({ verificationStatus: 'pending' }),
        makeParking({ verificationStatus: 'approved' })
      ]);
    }
  };

  const parkings = await listAdminParkings({ ParkingModel });

  assert.equal(parkings.pending.length, 1);
  assert.equal(parkings.approved.length, 1);
});

test('toggle active flips listing activity for platform control', async () => {
  const document = makeParking({ isActive: true });
  const ParkingModel = {
    async findById() {
      return document;
    }
  };

  const parking = await toggleAdminParkingActive(parkingId, { ParkingModel });

  assert.equal(parking.isActive, false);
});

test('admin booking oversight forwards status and entity filters', async () => {
  let receivedFilter;
  const BookingModel = {
    find(filter) {
      receivedFilter = filter;
      return {
        sort() {
          return {
            lean: async () => [makeBooking()]
          };
        }
      };
    }
  };

  const bookings = await listAdminBookings(
    {
      status: 'confirmed',
      parking: parkingId,
      user: '507f1f77bcf86cd799439033'
    },
    { BookingModel }
  );

  assert.equal(receivedFilter.status, 'confirmed');
  assert.equal(receivedFilter.parking, parkingId);
  assert.equal(bookings.length, 1);
});

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
  return {
    _id: {
      toString: () => parkingId
    },
    title: 'Station Parking',
    description: 'Secure station parking',
    address: 'MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    location: {
      coordinates: [73.8567, 18.5204]
    },
    totalSlots: 10,
    availableSlots: 8,
    vehicleTypes: ['4-wheeler'],
    hourlyPrice: 60,
    amenities: [],
    owner: {
      toString: () => '507f1f77bcf86cd799439034'
    },
    verificationStatus: overrides.verificationStatus ?? 'pending',
    rejectionReason: overrides.rejectionReason ?? '',
    isActive: overrides.isActive ?? true,
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z'),
    async save() {
      return this;
    }
  };
}

function makeBooking() {
  return {
    _id: {
      toString: () => bookingId
    },
    user: {
      toString: () => '507f1f77bcf86cd799439033'
    },
    parking: {
      toString: () => parkingId
    },
    vehicleType: '4-wheeler',
    bookingDate: '2026-05-01',
    startTime: '09:00',
    endTime: '11:00',
    slotCount: 1,
    totalAmount: 120,
    status: 'confirmed',
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z')
  };
}
