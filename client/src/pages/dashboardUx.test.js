import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));

test('driver dashboard contains personalized workspace sections', () => {
  const source = readFileSync(join(currentDir, 'DashboardPage.jsx'), 'utf8');

  assert.ok(source.includes('Overview'));
  assert.ok(source.includes('My Bookings'));
  assert.ok(source.includes('Saved Parkings'));
  assert.ok(source.includes('Recent Activity'));
  assert.ok(source.includes('Notifications'));
  assert.ok(source.includes('Quick rebook shortcuts'));
  assert.ok(source.includes("path: '/activity'") || source.includes("'/activity'"));
});

test('owner and admin dashboards expose modular control-panel sections', () => {
  const ownerSource = readFileSync(join(currentDir, '../features/parkings/OwnerParkingDashboard.jsx'), 'utf8');
  const adminSource = readFileSync(join(currentDir, '../features/admin/AdminDashboardPage.jsx'), 'utf8');

  assert.ok(ownerSource.includes('Occupancy'));
  assert.ok(ownerSource.includes('defaultTab="role"'));
  assert.ok(adminSource.includes('Overview'));
  assert.ok(adminSource.includes('Users'));
  assert.ok(adminSource.includes('Settings'));
});

test('workspace layout keeps responsive navigation affordances', () => {
  const layoutSource = readFileSync(join(currentDir, '../app/RoleWorkspaceLayout.jsx'), 'utf8');

  assert.ok(layoutSource.includes('overflow-x-auto'));
  assert.ok(layoutSource.includes('lg:hidden'));
  assert.ok(layoutSource.includes('PanelLeftClose'));
});

test('owner and admin dashboards include functional search surfaces', () => {
  const ownerSource = readFileSync(join(currentDir, '../features/parkings/OwnerParkingDashboard.jsx'), 'utf8');
  const adminSource = readFileSync(join(currentDir, '../features/admin/AdminDashboardPage.jsx'), 'utf8');

  assert.ok(ownerSource.includes('Search reservation'));
  assert.ok(adminSource.includes('Search users'));
  assert.ok(adminSource.includes('Search booking, user, or parking'));
});
