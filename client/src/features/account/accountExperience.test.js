import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuickRebookLink,
  getRecentSearches,
  getProfileCompletionScore,
  getReminderPlaceholders,
  recordRecentSearch
} from './accountExperience.js';

test.beforeEach(() => {
  globalThis.localStorage = createStorage();
  globalThis.sessionStorage = createStorage();
});

test('quick rebook builds parking detail link with booking times', () => {
  const link = buildQuickRebookLink({
    parking: 'parking_123',
    bookingDate: '2026-05-01',
    startTime: '09:00',
    endTime: '11:00'
  });

  assert.equal(link, '/parkings/parking_123?date=2026-05-01&startTime=09%3A00&endTime=11%3A00');
});

test('profile completion score increases with filled account details', () => {
  const score = getProfileCompletionScore({
    name: 'Asha',
    email: 'asha@example.com',
    phone: '9999999999',
    profilePhotoUrl: 'data:image/png;base64,photo',
    role: 'driver',
    driverProfile: {
      vehicleDetails: [{ label: 'Sedan' }],
      savedAddresses: [{ label: 'Home' }]
    }
  });

  assert.equal(score, 100);
});

test('booking reminders are derived from active bookings only', () => {
  const reminders = getReminderPlaceholders([
    { id: 'a', bookingDate: '2026-05-01', startTime: '09:00', endTime: '10:00', status: 'confirmed' },
    { id: 'b', bookingDate: '2026-05-02', startTime: '11:00', endTime: '12:00', status: 'completed' }
  ]);

  assert.equal(reminders.length, 1);
  assert.match(reminders[0].detail, /coming up soon/);
});

test('guest recent searches are isolated by anonymous browser session', () => {
  recordRecentSearch({ label: 'Downtown' });

  assert.equal(getRecentSearches().length, 1);

  const firstSessionData = globalThis.sessionStorage.dump();
  globalThis.sessionStorage = createStorage();

  assert.deepEqual(getRecentSearches(), []);
  assert.notDeepEqual(globalThis.sessionStorage.dump(), firstSessionData);
});

test('authenticated recent searches are isolated by signed-in user id', () => {
  globalThis.localStorage.setItem('smartpark_auth', JSON.stringify({ user: { id: 'user-1' }, token: 'a' }));
  recordRecentSearch({ label: 'Airport' });

  globalThis.localStorage.setItem('smartpark_auth', JSON.stringify({ user: { id: 'user-2' }, token: 'b' }));
  assert.deepEqual(getRecentSearches(), []);

  recordRecentSearch({ label: 'Stadium' });
  assert.deepEqual(getRecentSearches().map((item) => item.label), ['Stadium']);

  globalThis.localStorage.setItem('smartpark_auth', JSON.stringify({ user: { id: 'user-1' }, token: 'a' }));
  assert.deepEqual(getRecentSearches().map((item) => item.label), ['Airport']);
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
    },
    clear() {
      store.clear();
    },
    dump() {
      return Object.fromEntries(store.entries());
    }
  };
}
