import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimatedTotal,
  getBookingDurationHours,
  groupBookingsByStatus,
  validateBookingForm
} from './bookingUtils.js';

test('booking form validation rejects missing and invalid time fields', () => {
  assert.match(validateBookingForm({}), /Complete all booking fields/);
  assert.match(
    validateBookingForm({
      bookingDate: '2026-05-01',
      startTime: '11:00',
      endTime: '10:00',
      vehicleType: '4-wheeler',
      slotCount: 1
    }),
    /End time/
  );
});

test('booking form validation accepts a complete reservation request', () => {
  assert.equal(
    validateBookingForm({
      bookingDate: '2026-05-01',
      startTime: '09:00',
      endTime: '11:00',
      vehicleType: '4-wheeler',
      slotCount: 1
    }),
    ''
  );
});

test('estimated total uses rounded-up duration and slot count', () => {
  assert.equal(getBookingDurationHours('09:00', '10:30'), 2);
  assert.equal(
    calculateEstimatedTotal({
      startTime: '09:00',
      endTime: '10:30',
      hourlyPrice: 60,
      slotCount: 2
    }),
    240
  );
});

test('booking history groups upcoming, cancelled, and completed cards', () => {
  const grouped = groupBookingsByStatus([
    { status: 'confirmed' },
    { status: 'pending' },
    { status: 'cancelled' },
    { status: 'completed' }
  ]);

  assert.equal(grouped.upcoming.length, 2);
  assert.equal(grouped.cancelled.length, 1);
  assert.equal(grouped.completed.length, 1);
});
