import test from 'node:test';
import assert from 'node:assert/strict';
import { getBookingSubmitPlan } from './bookingIntent.js';

test('guest booking submit is intercepted for authentication without losing booking draft', () => {
  const result = getBookingSubmitPlan({
    form: {
      bookingDate: '2026-05-01',
      startTime: '09:00',
      endTime: '11:00',
      vehicleType: 'car',
      slotCount: '2'
    },
    isAuthenticated: false
  });

  assert.deepEqual(result, {
    kind: 'auth_required',
    draft: {
      bookingDate: '2026-05-01',
      startTime: '09:00',
      endTime: '11:00',
      vehicleType: 'car',
      slotCount: 2
    }
  });
});

test('authenticated booking submit proceeds to API submission', () => {
  const result = getBookingSubmitPlan({
    form: {
      bookingDate: '2026-05-01',
      startTime: '09:00',
      endTime: '11:00',
      vehicleType: 'car',
      slotCount: 1
    },
    isAuthenticated: true
  });

  assert.deepEqual(result, { kind: 'submit' });
});
