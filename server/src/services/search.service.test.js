import test from 'node:test';
import assert from 'node:assert/strict';
import { getSearchSuggestions } from './search.service.js';

test('search suggestions returns city, area, and parking title matches', async () => {
  const ParkingModel = {
    async distinct(field, filter) {
      assert.equal(filter.verificationStatus, 'approved');
      assert.equal(filter.isActive, true);
      assert.equal(filter[field].source, '^pu');

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
      assert.equal(filter.title.source, '^pu');

      return {
        select(projection) {
          assert.deepEqual(projection, { title: 1, city: 1, state: 1, _id: 0 });
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

test('search suggestions caps query length before building regex', async () => {
  let receivedRegex;

  const ParkingModel = {
    async distinct(_field, filter) {
      receivedRegex = filter.city ?? filter.area;
      return [];
    },
    find() {
      return {
        select() {
          return this;
        },
        limit() {
          return {
            lean: async () => []
          };
        }
      };
    }
  };

  await getSearchSuggestions({ q: 'a'.repeat(200) }, { ParkingModel });

  assert.equal(receivedRegex.source.length, 81);
});
