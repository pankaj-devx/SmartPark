import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { getSafeUser, updateCurrentUser, updateCurrentUserPassword } from './auth.service.js';

test('getSafeUser removes sensitive fields', () => {
  const safeUser = getSafeUser({
    _id: { toString: () => 'user_123' },
    name: 'Asha Driver',
    email: 'asha@example.com',
    role: 'driver',
    phone: '9999999999',
    status: 'active',
    profilePhotoUrl: 'data:image/png;base64,photo',
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: true,
      compactMode: false
    },
    driverProfile: {
      vehicleDetails: [{ label: 'Sedan', registrationNumber: 'MH12AB1234', vehicleType: '4-wheeler', color: 'Blue' }],
      savedAddresses: [{ label: 'Home', address: 'Baner, Pune' }],
      preferredParking: { vehicleType: '4-wheeler', maxHourlyPrice: 120, coveredOnly: true, evPreferred: false }
    },
    ownerProfile: {
      businessName: '',
      businessType: '',
      taxId: '',
      supportEmail: '',
      supportPhone: ''
    },
    adminProfile: {
      notificationChannel: 'email',
      notes: ''
    },
    passwordHash: 'secret_hash'
  });

  assert.deepEqual(safeUser, {
    id: 'user_123',
    name: 'Asha Driver',
    email: 'asha@example.com',
    role: 'driver',
    phone: '9999999999',
    status: 'active',
    profilePhotoUrl: 'data:image/png;base64,photo',
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: true,
      compactMode: false
    },
    driverProfile: {
      vehicleDetails: [{ label: 'Sedan', registrationNumber: 'MH12AB1234', vehicleType: '4-wheeler', color: 'Blue' }],
      savedAddresses: [{ label: 'Home', address: 'Baner, Pune' }],
      preferredParking: { vehicleType: '4-wheeler', maxHourlyPrice: 120, coveredOnly: true, evPreferred: false }
    },
    ownerProfile: {
      businessName: '',
      businessType: '',
      taxId: '',
      supportEmail: '',
      supportPhone: ''
    },
    adminProfile: {
      notificationChannel: 'email',
      notes: ''
    }
  });
  assert.equal('passwordHash' in safeUser, false);
});

test('profile editing updates common fields and saves profile image flow', async () => {
  const user = makeUser({ role: 'driver' });
  const UserModel = {
    async findOne() {
      return null;
    }
  };

  const updated = await updateCurrentUser(user, {
    name: 'Asha Updated',
    email: 'updated@example.com',
    phone: '8888888888',
    profilePhotoUrl: 'data:image/png;base64,updated-photo',
    preferences: {
      emailNotifications: false,
      smsNotifications: true,
      marketingEmails: false,
      compactMode: true
    },
    driverProfile: user.driverProfile
  }, { UserModel });

  assert.equal(updated.name, 'Asha Updated');
  assert.equal(updated.email, 'updated@example.com');
  assert.equal(updated.profilePhotoUrl, 'data:image/png;base64,updated-photo');
  assert.equal(updated.preferences.smsNotifications, true);
  assert.equal(user.saveCalls, 1);
});

test('role-specific profile fields persist for owner and admin accounts', async () => {
  const owner = makeUser({ role: 'owner' });
  const admin = makeUser({ role: 'admin' });
  const UserModel = {
    async findOne() {
      return null;
    }
  };

  const ownerUpdated = await updateCurrentUser(owner, {
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    profilePhotoUrl: owner.profilePhotoUrl,
    preferences: owner.preferences,
    ownerProfile: {
      businessName: 'Central Parking LLP',
      businessType: 'Managed lots',
      taxId: 'GSTIN123',
      supportEmail: 'support@central.example',
      supportPhone: '7777777777'
    }
  }, { UserModel });
  const adminUpdated = await updateCurrentUser(admin, {
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    profilePhotoUrl: admin.profilePhotoUrl,
    preferences: admin.preferences,
    adminProfile: {
      notificationChannel: 'slack',
      notes: 'Can review approval backlog'
    }
  }, { UserModel });

  assert.equal(ownerUpdated.ownerProfile.businessName, 'Central Parking LLP');
  assert.equal(ownerUpdated.ownerProfile.supportEmail, 'support@central.example');
  assert.equal(adminUpdated.adminProfile.notificationChannel, 'slack');
  assert.equal(adminUpdated.adminProfile.notes, 'Can review approval backlog');
});

test('password settings require current password and save a new hash', async () => {
  const hashedPassword = await bcrypt.hash('CurrentPass1', 12);
  const persistedUser = makeUser({ passwordHash: hashedPassword });
  const UserModel = {
    findById() {
      return {
        select: async () => persistedUser
      };
    }
  };

  const updated = await updateCurrentUserPassword(makeUser(), {
    currentPassword: 'CurrentPass1',
    newPassword: 'NextPass2'
  }, { UserModel });

  assert.equal(updated.id, 'user_123');
  assert.equal(persistedUser.saveCalls, 1);
  assert.equal(await bcrypt.compare('NextPass2', persistedUser.passwordHash), true);
});

function makeUser(overrides = {}) {
  return {
    _id: { toString: () => 'user_123' },
    name: overrides.name ?? 'Asha Driver',
    email: overrides.email ?? 'asha@example.com',
    role: overrides.role ?? 'driver',
    phone: overrides.phone ?? '9999999999',
    status: 'active',
    profilePhotoUrl: overrides.profilePhotoUrl ?? '',
    preferences: overrides.preferences ?? {
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
      compactMode: false
    },
    driverProfile: overrides.driverProfile ?? {
      vehicleDetails: [],
      savedAddresses: [],
      preferredParking: { vehicleType: '4-wheeler', maxHourlyPrice: 0, coveredOnly: false, evPreferred: false }
    },
    ownerProfile: overrides.ownerProfile ?? {
      businessName: '',
      businessType: '',
      taxId: '',
      supportEmail: '',
      supportPhone: ''
    },
    adminProfile: overrides.adminProfile ?? {
      notificationChannel: 'email',
      notes: ''
    },
    passwordHash: overrides.passwordHash ?? 'hash',
    saveCalls: 0,
    async save() {
      this.saveCalls += 1;
      return this;
    }
  };
}
