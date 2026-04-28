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
  const dashboardRouteIndex = routerSource.indexOf('<DashboardRoute activeSection="bookings" />', protectedRouteIndex);

  assert.ok(bookingsRouteIndex > -1);
  assert.ok(protectedRouteIndex > bookingsRouteIndex);
  assert.ok(dashboardRouteIndex > protectedRouteIndex);
});

test('owner dashboard route is restricted to owner and admin roles', () => {
  const routerSource = readFileSync(join(currentDir, 'router.jsx'), 'utf8');
  const ownerRouteIndex = routerSource.indexOf("path: 'owner'");
  const protectedRouteIndex = routerSource.indexOf("<ProtectedRoute roles={['owner', 'admin']}>", ownerRouteIndex);
  const ownerDashboardIndex = routerSource.indexOf("path: 'dashboard'", protectedRouteIndex);

  assert.ok(ownerRouteIndex > -1);
  assert.ok(protectedRouteIndex > ownerRouteIndex);
  assert.ok(ownerDashboardIndex > protectedRouteIndex);
});

test('admin approvals route is restricted to admin role', () => {
  const routerSource = readFileSync(join(currentDir, 'router.jsx'), 'utf8');
  const adminRouteIndex = routerSource.indexOf("path: 'admin'");
  const protectedRouteIndex = routerSource.indexOf("<ProtectedRoute roles={['admin']}>", adminRouteIndex);
  const approvalsRouteIndex = routerSource.indexOf("path: 'approvals'", protectedRouteIndex);

  assert.ok(adminRouteIndex > -1);
  assert.ok(protectedRouteIndex > adminRouteIndex);
  assert.ok(approvalsRouteIndex > protectedRouteIndex);
});

test('driver dashboard routes map to workspace sections', () => {
  const routerSource = readFileSync(join(currentDir, 'router.jsx'), 'utf8');

  assert.ok(routerSource.includes("path: 'saved'"));
  assert.ok(routerSource.includes('<DashboardRoute activeSection="saved" />'));
  assert.ok(routerSource.includes("path: 'activity'"));
  assert.ok(routerSource.includes('<DashboardRoute activeSection="activity" />'));
  assert.ok(routerSource.includes("path: 'notifications'"));
  assert.ok(routerSource.includes('<DashboardRoute activeSection="notifications" />'));
  assert.ok(routerSource.includes("path: 'settings'"));
  assert.ok(routerSource.includes('<DashboardRoute activeSection="settings" />'));
});

test('owner workspace exposes occupancy section and settings route integration', () => {
  const routerSource = readFileSync(join(currentDir, 'router.jsx'), 'utf8');

  assert.ok(routerSource.includes("path: 'overview'"));
  assert.ok(routerSource.includes("path: 'occupancy'"));
  assert.ok(routerSource.includes('<OwnerParkingDashboard activeSection="occupancy" />'));
  assert.ok(routerSource.includes('<OwnerParkingDashboard activeSection="settings" />'));
});
