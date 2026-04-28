import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoles } from './authorizeRoles.js';

test('authorizeRoles blocks users without the required role', () => {
  const middleware = authorizeRoles('owner');
  let receivedError;

  middleware(
    {
      user: {
        role: 'driver'
      }
    },
    {},
    (error) => {
      receivedError = error;
    }
  );

  assert.equal(receivedError.statusCode, 403);
});

test('authorizeRoles allows users with the required role', () => {
  const middleware = authorizeRoles('owner');
  let called = false;

  middleware(
    {
      user: {
        role: 'owner'
      }
    },
    {},
    () => {
      called = true;
    }
  );

  assert.equal(called, true);
});

