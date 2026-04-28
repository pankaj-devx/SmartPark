import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));

test('bookings page route is protected by authentication', () => {
  const routerSource = readFileSync(join(currentDir, 'router.jsx'), 'utf8');
  const bookingsRouteIndex = routerSource.indexOf("path: 'bookings'");
  const protectedRouteIndex = routerSource.indexOf('<ProtectedRoute>', bookingsRouteIndex);
  const myBookingsIndex = routerSource.indexOf('<MyBookingsPage />', protectedRouteIndex);

  assert.ok(bookingsRouteIndex > -1);
  assert.ok(protectedRouteIndex > bookingsRouteIndex);
  assert.ok(myBookingsIndex > protectedRouteIndex);
});
