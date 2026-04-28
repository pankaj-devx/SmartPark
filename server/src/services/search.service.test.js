import test from 'node:test';
import assert from 'node:assert/strict';
import { getSearchSuggestions } from './search.service.js';

test('search suggestions returns city, area, and parking title matches', async () => {
  const ParkingModel = {
    async distinct(field, filter) {
      assert.equal(filter.verificationStatus, 'approved');
      assert.equal(filter.isActive, true);

      if (field === 'city') {
        return ['Pune'];
      }

      if (field === 'area') {
        return ['Camp'];
      }

      return [];
    },
    find(filter) {
      assert.equal(filter.verificationStatus, 'approved');
      assert.equal(filter.isActive, true);

      return {
        select() {
          return this;
        },
        limit() {
          return {
            lean: async () => [{ title: 'Central Station Parking', city: 'Pune', state: 'Maharashtra' }]
          };
        }
      };
    }
  };

  const result = await getSearchSuggestions({ q: 'pu' }, { ParkingModel });

  assert.deepEqual(result.suggestions[0], { type: 'city', value: 'Pune' });
  assert.deepEqual(result.suggestions[1], { type: 'area', value: 'Camp' });
  assert.equal(result.suggestions[2].type, 'parking');
  assert.equal(result.suggestions[2].value, 'Central Station Parking');
});

test('search suggestions ignores short queries', async () => {
  const result = await getSearchSuggestions({ q: 'p' }, {});

  assert.deepEqual(result.suggestions, []);
});
