import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { authLimiter } from './rateLimiter.js';
import { validateRequest } from './validateRequest.js';
import { createBookingSchema } from '../validators/booking.validator.js';
import { createReviewSchema } from '../validators/review.validator.js';

test('invalid review payload is rejected by request validation', () => {
  const middleware = validateRequest(createReviewSchema);
  let receivedError;

  middleware(
    { body: { bookingId: '507f1f77bcf86cd799439013', rating: 6, comment: 'Too high' } },
    {},
    (error) => {
      receivedError = error;
    }
  );

  assert.equal(receivedError.statusCode, 400);
  assert.equal(receivedError.message, 'Request validation failed');
});

test('invalid booking payload is rejected by request validation', () => {
  const middleware = validateRequest(createBookingSchema);
  let receivedError;

  middleware(
    {
      body: {
        parking: '507f1f77bcf86cd799439013',
        vehicleType: '4-wheeler',
        bookingDate: '2026-05-05',
        startTime: '12:00',
        endTime: '11:00',
        slotCount: 1
      }
    },
    {},
    (error) => {
      receivedError = error;
    }
  );

  assert.equal(receivedError.statusCode, 400);
  assert.equal(receivedError.message, 'Request validation failed');
});

test('auth limiter blocks too many login attempts', async () => {
  const app = express();
  app.use(authLimiter);
  app.post('/login', (_req, res) => res.status(401).json({ message: 'Invalid credentials' }));

  const server = await listen(app);

  try {
    const url = `http://127.0.0.1:${server.address().port}/login`;
    const statuses = [];

    for (let i = 0; i < 6; i += 1) {
      const response = await fetch(url, { method: 'POST' });
      statuses.push(response.status);
    }

    assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401]);
    assert.equal(statuses[5], 429);
  } finally {
    await close(server);
  }
});

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
