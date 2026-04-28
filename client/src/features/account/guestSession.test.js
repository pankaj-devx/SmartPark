import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearGuestBookingIntent,
  getGuestBookingIntent,
  getGuestSessionId,
  saveGuestBookingIntent
} from './guestSession.js';

test.beforeEach(() => {
  globalThis.sessionStorage = createStorage();
});

test('guest session id persists for the current browser session', () => {
  const first = getGuestSessionId();
  const second = getGuestSessionId();

  assert.equal(first, second);
  assert.match(first, /guest-|[0-9a-f-]{8,}/i);
});

test('guest session ids are isolated across separate browser sessions', () => {
  const first = getGuestSessionId();

  globalThis.sessionStorage = createStorage();
  const second = getGuestSessionId();

  assert.notEqual(first, second);
});

test('guest booking intent is stored locally for the current anonymous session only', () => {
  saveGuestBookingIntent({
    parkingId: 'parking-1',
    bookingDate: '2026-05-01',
    startTime: '09:00',
    endTime: '11:00',
    vehicleType: 'car',
    slotCount: 1
  });

  assert.equal(getGuestBookingIntent('parking-1')?.parkingId, 'parking-1');

  globalThis.sessionStorage = createStorage();
  assert.equal(getGuestBookingIntent('parking-1'), null);
});

test('guest booking intent can be cleared after booking completion', () => {
  saveGuestBookingIntent({
    parkingId: 'parking-2',
    bookingDate: '2026-05-02',
    startTime: '10:00',
    endTime: '12:00',
    vehicleType: 'car',
    slotCount: 1
  });

  clearGuestBookingIntent('parking-2');

  assert.equal(getGuestBookingIntent('parking-2'), null);
});

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}
