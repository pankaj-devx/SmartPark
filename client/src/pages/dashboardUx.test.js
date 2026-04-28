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
  assert.ok(layoutSource.includes('toggleTheme'));
});

test('owner and admin dashboards include functional search surfaces', () => {
  const ownerSource = readFileSync(join(currentDir, '../features/parkings/OwnerParkingDashboard.jsx'), 'utf8');
  const adminSource = readFileSync(join(currentDir, '../features/admin/AdminDashboardPage.jsx'), 'utf8');

  assert.ok(ownerSource.includes('Search reservation'));
  assert.ok(adminSource.includes('Search users'));
  assert.ok(adminSource.includes('Search booking, user, or parking'));
});

test('driver home exposes personalized premium widgets', () => {
  const source = readFileSync(join(currentDir, 'DriverHomePage.jsx'), 'utf8');

  assert.ok(source.includes('export function DriverHomePage'));
  assert.ok(source.includes('Driver home'));
  assert.ok(source.includes('Upcoming booking summary'));
  assert.ok(source.includes('Booking reminders'));
  assert.ok(source.includes('Quick reserve shortcuts'));
  assert.ok(source.includes('Saved parkings'));
  assert.ok(source.includes('Nearby recommendations'));
  assert.ok(source.includes('Continue recent search'));
  assert.ok(source.includes('Recent activity'));
  assert.ok(source.includes('buildGreeting'));
  assert.ok(source.includes('Explore live parking'));
});

test('driver home reuses account experience helpers instead of rebuilding storage', () => {
  const source = readFileSync(join(currentDir, 'DriverHomePage.jsx'), 'utf8');

  assert.ok(source.includes("from '../features/account/accountExperience.js'"));
  assert.ok(source.includes('getSavedParkings'));
  assert.ok(source.includes('getRecentSearches'));
  assert.ok(source.includes('getRecentActivity'));
  assert.ok(source.includes('getReminderPlaceholders'));
  assert.ok(source.includes('buildQuickRebookLink'));
  assert.ok(source.includes('fetchMyBookings'));
});

test('theme controls are available in the app shell and settings preferences', () => {
  const layoutSource = readFileSync(join(currentDir, '../app/AppLayout.jsx'), 'utf8');
  const settingsSource = readFileSync(join(currentDir, '../features/profile/AccountSettingsPanel.jsx'), 'utf8');
  const themeProviderSource = readFileSync(join(currentDir, '../features/theme/ThemeProvider.jsx'), 'utf8');

  assert.ok(layoutSource.includes('useTheme'));
  assert.ok(layoutSource.includes('toggleTheme'));
  assert.ok(layoutSource.includes('Dark mode'));
  assert.ok(settingsSource.includes('Appearance'));
  assert.ok(settingsSource.includes("setTheme('dark')"));
  assert.ok(settingsSource.includes("setTheme('light')"));
  assert.ok(settingsSource.includes("setTheme('system')"));
  assert.ok(themeProviderSource.includes("localStorage.setItem('smartpark_theme', theme)"));
});

test('shared design tokens harden dark-mode contrast for surfaces and text', () => {
  const stylesSource = readFileSync(join(currentDir, '../styles/index.css'), 'utf8');

  assert.ok(stylesSource.includes("--app-text: #f2f7ff"));
  assert.ok(stylesSource.includes("--app-text-muted: #d8e2f0"));
  assert.ok(stylesSource.includes("--app-text-soft: #afbdd1"));
  assert.ok(stylesSource.includes('--app-surface-subtle'));
  assert.ok(stylesSource.includes('.app-link'));
  assert.ok(stylesSource.includes('.app-modal'));
  assert.ok(stylesSource.includes('.app-divider'));
});

test('public booking and auth surfaces use shared theme-aware styles', () => {
  const searchSource = readFileSync(join(currentDir, '../features/parkings/SearchResultsPage.jsx'), 'utf8');
  const detailSource = readFileSync(join(currentDir, '../features/parkings/ParkingDetailPage.jsx'), 'utf8');
  const bookingSource = readFileSync(join(currentDir, '../features/bookings/BookingModal.jsx'), 'utf8');
  const authSource = readFileSync(join(currentDir, '../features/auth/AuthModal.jsx'), 'utf8');

  assert.ok(searchSource.includes('app-input'));
  assert.ok(searchSource.includes('app-pill'));
  assert.ok(detailSource.includes('app-card-muted'));
  assert.ok(bookingSource.includes('app-modal'));
  assert.ok(bookingSource.includes('app-card-muted'));
  assert.ok(authSource.includes('app-modal'));
});

test('navigation labels are less repetitive and route to distinct driver destinations', () => {
  const navigationSource = readFileSync(join(currentDir, '../app/navigation.js'), 'utf8');
  const layoutSource = readFileSync(join(currentDir, '../app/AppLayout.jsx'), 'utf8');

  assert.ok(navigationSource.includes("{ label: 'Home', to: '/dashboard'"));
  assert.ok(navigationSource.includes("{ label: 'Discover', to: '/parkings'"));
  assert.ok(navigationSource.includes("{ label: 'Reservations', to: '/bookings'"));
  assert.ok(layoutSource.includes('Explore'));
  assert.ok(layoutSource.includes('All spaces'));
  assert.ok(layoutSource.includes('/register?role=owner'));
});
