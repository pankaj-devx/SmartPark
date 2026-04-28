import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeUser } from './auth.service.js';

test('getSafeUser removes sensitive fields', () => {
  const safeUser = getSafeUser({
    _id: { toString: () => 'user_123' },
    name: 'Asha Driver',
    email: 'asha@example.com',
    role: 'driver',
    phone: '9999999999',
    status: 'active',
    passwordHash: 'secret_hash'
  });

  assert.deepEqual(safeUser, {
    id: 'user_123',
    name: 'Asha Driver',
    email: 'asha@example.com',
    role: 'driver',
    phone: '9999999999',
    status: 'active'
  });
  assert.equal('passwordHash' in safeUser, false);
});

