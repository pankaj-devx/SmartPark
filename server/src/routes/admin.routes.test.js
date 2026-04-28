import test from 'node:test';
import assert from 'node:assert/strict';
import { adminRoutes } from './admin.routes.js';

test('admin routes enforce admin authorization at router level', () => {
  const middlewareLayers = adminRoutes.stack.filter((layer) => layer.name !== 'handle');
  let ownerError;
  let adminPassed = false;

  assert.equal(middlewareLayers.length, 3);
  assert.equal(middlewareLayers[0].name, 'requireDatabase');
  middlewareLayers[2].handle({ user: { role: 'owner' } }, {}, (error) => {
    ownerError = error;
  });
  middlewareLayers[2].handle({ user: { role: 'admin' } }, {}, () => {
    adminPassed = true;
  });

  assert.equal(ownerError.statusCode, 403);
  assert.equal(adminPassed, true);
});
