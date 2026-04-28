import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerRoutes } from './owner.routes.js';

test('owner routes require owner or admin role', () => {
  const middlewareLayers = ownerRoutes.stack.filter((layer) => layer.name !== 'handle');
  let driverError;
  let ownerPassed = false;

  assert.equal(middlewareLayers.length, 3);
  assert.equal(middlewareLayers[0].name, 'requireDatabase');
  middlewareLayers[2].handle({ user: { role: 'driver' } }, {}, (error) => {
    driverError = error;
  });
  middlewareLayers[2].handle({ user: { role: 'owner' } }, {}, () => {
    ownerPassed = true;
  });

  assert.equal(driverError.statusCode, 403);
  assert.equal(ownerPassed, true);
});
