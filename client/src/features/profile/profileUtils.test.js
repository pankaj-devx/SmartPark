import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfilePayload, getInitialProfileForm, validateProfileForm, validateProfileImageFile } from './profileUtils.js';

test('profile editing payload trims common fields', () => {
  const payload = buildProfilePayload(
    {
      name: ' Asha Driver ',
      email: ' ASHA@EXAMPLE.COM ',
      phone: ' 9999999999 ',
      profilePhotoUrl: 'data:image/png;base64,photo',
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: true,
        compactMode: false
      },
      driverProfile: {
        vehicleDetails: [{ label: '', registrationNumber: '', vehicleType: '4-wheeler', color: '' }],
        savedAddresses: [{ label: '', address: '' }],
        preferredParking: { vehicleType: '4-wheeler', maxHourlyPrice: 0, coveredOnly: false, evPreferred: false }
      },
      ownerProfile: {},
      adminProfile: {}
    },
    'driver'
  );

  assert.equal(payload.name, 'Asha Driver');
  assert.equal(payload.email, 'asha@example.com');
  assert.equal(payload.phone, '9999999999');
});

test('profile image flow accepts valid images and rejects oversized files', () => {
  assert.equal(validateProfileImageFile({ type: 'image/png', size: 1400 }), '');
  assert.match(validateProfileImageFile({ type: 'text/plain', size: 20 }), /image file/);
  assert.match(validateProfileImageFile({ type: 'image/jpeg', size: 2_000_000 }), /1.5 MB/);
});

test('role-specific profile fields are preserved for driver owner and admin', () => {
  const initial = getInitialProfileForm({
    role: 'driver',
    driverProfile: {
      vehicleDetails: [{ label: 'Sedan', registrationNumber: 'MH12AB1234', vehicleType: '4-wheeler', color: 'Blue' }],
      savedAddresses: [{ label: 'Home', address: 'Baner, Pune' }],
      preferredParking: { vehicleType: '2-wheeler', maxHourlyPrice: 90, coveredOnly: true, evPreferred: true }
    },
    ownerProfile: { businessName: 'Central Parking LLP' },
    adminProfile: { notificationChannel: 'slack', notes: 'Ops' }
  });

  const driverPayload = buildProfilePayload(initial, 'driver');
  const ownerPayload = buildProfilePayload({ ...initial, ownerProfile: { businessName: 'Central Parking LLP', businessType: 'Valet', taxId: 'GSTIN', supportEmail: 'support@example.com', supportPhone: '9999' } }, 'owner');
  const adminPayload = buildProfilePayload({ ...initial, adminProfile: { notificationChannel: 'slack', notes: 'Ops access' } }, 'admin');

  assert.equal(driverPayload.driverProfile.vehicleDetails[0].registrationNumber, 'MH12AB1234');
  assert.equal(ownerPayload.ownerProfile.businessName, 'Central Parking LLP');
  assert.equal(adminPayload.adminProfile.notificationChannel, 'slack');
});

test('profile validation blocks malformed identity fields', () => {
  assert.match(validateProfileForm({ name: ' ', email: 'valid@example.com', phone: '' }), /full name/);
  assert.match(validateProfileForm({ name: 'Asha', email: 'invalid-email', phone: '' }), /valid email/);
  assert.match(validateProfileForm({ name: 'Asha', email: 'valid@example.com', phone: 'bad-phone' }), /valid phone/);
  assert.equal(validateProfileForm({ name: 'Asha', email: 'valid@example.com', phone: '+91 9999999999' }), '');
});
