import test from 'node:test';
import assert from 'node:assert/strict';
import { getHealth } from './health.controller.js';

test('getHealth returns service status', () => {
  let statusCode;
  let responseBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  getHealth({}, res);

  assert.equal(statusCode, 200);
  assert.equal(responseBody.success, true);
  assert.equal(responseBody.data.service, 'smartpark-api');
  assert.equal(responseBody.data.status, 'ok');
  assert.ok(responseBody.data.timestamp);
});

