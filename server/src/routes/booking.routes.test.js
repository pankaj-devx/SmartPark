import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingRoutes } from './booking.routes.js';

test('booking routes require driver authorization', () => {
  const bookingRouteLayers = bookingRoutes.stack.filter((layer) => layer.route);

  for (const layer of bookingRouteLayers) {
    const middlewareNames = layer.route.stack.map((routeLayer) => routeLayer.name);
    const authorizeIndex = 2;

    assert.equal(middlewareNames[0], 'requireDatabase');
    assert.equal(middlewareNames[1], '<anonymous>');
    assert.equal(middlewareNames[authorizeIndex], '<anonymous>');

    let ownerError;
    let driverPassed = false;

    layer.route.stack[authorizeIndex].handle({ user: { role: 'owner' } }, {}, (error) => {
      ownerError = error;
    });
    layer.route.stack[authorizeIndex].handle({ user: { role: 'driver' } }, {}, () => {
      driverPassed = true;
    });

    assert.equal(ownerError.statusCode, 403);
    assert.equal(driverPassed, true);
  }
});
