import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuickRebookLink,
  getProfileCompletionScore,
  getReminderPlaceholders
} from './accountExperience.js';

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
