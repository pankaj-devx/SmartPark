import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscoveryPath, filtersFromSearchParams, filtersToSearchParams } from './discoveryFilters.js';

test('buildDiscoveryPath creates public search URLs for keyword discovery', () => {
  assert.equal(buildDiscoveryPath({ search: 'Downtown' }), '/parkings?search=Downtown');
  assert.equal(
    buildDiscoveryPath({ search: 'Airport', date: '2026-05-01', startTime: '09:00', endTime: '11:00' }),
    '/parkings?search=Airport&date=2026-05-01&startTime=09%3A00&endTime=11%3A00'
  );
});

test('buildDiscoveryPath supports nearby discovery and sort intent', () => {
  assert.equal(
    buildDiscoveryPath({ lat: '12.9716', lng: '77.5946', sort: 'nearest' }),
    '/parkings?sort=nearest&lat=12.9716&lng=77.5946'
  );
});

test('filtersFromSearchParams restores guest discovery filters from the URL', () => {
  const filters = filtersFromSearchParams(
    new URLSearchParams('search=Stadium&date=2026-05-04&startTime=18%3A00&endTime=21%3A00&amenities=covered,cctv&availableOnly=false')
  );

  assert.equal(filters.search, 'Stadium');
  assert.equal(filters.date, '2026-05-04');
  assert.equal(filters.startTime, '18:00');
  assert.equal(filters.endTime, '21:00');
  assert.deepEqual(filters.amenities, ['covered', 'cctv']);
  assert.equal(filters.availableOnly, false);
});

test('filtersToSearchParams keeps query serialization stable for search pages', () => {
  const params = filtersToSearchParams({
    search: 'Airport',
    date: '',
    startTime: '',
    endTime: '',
    vehicleType: '',
    parkingType: '',
    state: '',
    district: '',
    city: '',
    area: '',
    minPrice: '',
    maxPrice: '',
    amenities: [],
    availableOnly: true,
    openNow: false,
    isOpen24x7: false,
    sort: 'relevance',
    lat: '12.9716',
    lng: '77.5946',
    radiusKm: '5'
  });

  assert.equal(params.toString(), 'search=Airport&lat=12.9716&lng=77.5946');
});
