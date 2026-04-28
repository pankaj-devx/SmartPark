import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));

test('guest homepage connects major discovery and conversion flows', () => {
  const source = readFileSync(join(currentDir, 'HomePage.jsx'), 'utf8');

  assert.ok(source.includes('Find parking nearby'));
  assert.ok(source.includes('buildDiscoveryPath'));
  assert.ok(source.includes('/register?role=owner'));
  assert.ok(source.includes('Create an account'));
  assert.ok(source.includes('Continue exploring'));
  assert.ok(source.includes('Recently viewed'));
  assert.ok(source.includes('Reserve preview'));
  assert.ok(source.includes('Pick up from the places and searches'));
  assert.ok(source.includes('Explore freely'));
  assert.ok(source.includes('Keep momentum'));
});

test('guest hero uses denser layout composition instead of a sparse split hero', () => {
  const source = readFileSync(join(currentDir, 'HomePage.jsx'), 'utf8');

  assert.ok(source.includes('xl:grid-cols-[1.3fr_0.95fr]'));
  assert.ok(source.includes('HeroMetric'));
  assert.ok(source.includes('continueExploringItems.slice(0, 3)'));
});

test('guest dashboard removes tutorial-style sections in favor of fewer stronger modules', () => {
  const source = readFileSync(join(currentDir, 'HomePage.jsx'), 'utf8');

  assert.ok(!source.includes('How booking works'));
  assert.ok(!source.includes('Trending locations'));
  assert.ok(!source.includes('StatTile'));
  assert.ok(source.includes('Featured parking spaces'));
  assert.ok(source.includes('Nearby recommended parking'));
});

test('guest featured cards and search results route into listing detail and reserve preview', () => {
  const homeSource = readFileSync(join(currentDir, 'HomePage.jsx'), 'utf8');
  const resultsSource = readFileSync(join(currentDir, '../features/parkings/SearchResultsPage.jsx'), 'utf8');

  assert.ok(homeSource.includes("const reservePath = `/parkings/${parking.id}?intent=reserve`;"));
  assert.ok(resultsSource.includes("intent: 'reserve'"));
  assert.ok(resultsSource.includes('Reserve preview'));
  assert.ok(resultsSource.includes("title: 'Sign in to save parking'"));
});

test('guest booking flow previews reservation before auth and keeps hard route protection', () => {
  const detailSource = readFileSync(join(currentDir, '../features/parkings/ParkingDetailPage.jsx'), 'utf8');
  const routerSource = readFileSync(join(currentDir, '../routes/router.jsx'), 'utf8');

  assert.ok(detailSource.includes("useState(() => searchParams.get('intent') === 'reserve')"));
  assert.ok(detailSource.includes("title: 'Sign in to complete your reservation'"));
  assert.ok(detailSource.includes('isAuthenticated={isAuthenticated}'));
  assert.ok(detailSource.includes('onRequireAuth={handleRequireAuth}'));
  assert.ok(routerSource.includes("path: 'bookings'"));
  assert.ok(routerSource.includes("<ProtectedRoute roles={['owner', 'admin']}>"));
  assert.ok(routerSource.includes("<ProtectedRoute roles={['admin']}>"));
});
