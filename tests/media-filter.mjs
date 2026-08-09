import assert from 'node:assert/strict';
import { mediaMatches, queryValues } from '../src/lib/media-filter.js';

const types = ['book', 'movie', 'show'];
const statuses = ['queued', 'consuming', 'finished'];

assert.deepEqual(
  queryValues('?type=book,movie&type=nonsense', 'type', types),
  ['book', 'movie'],
);
assert.deepEqual(queryValues('?type=nonsense', 'type', types), []);
assert.deepEqual(
  queryValues('?status=queued,consuming', 'status', statuses),
  ['queued', 'consuming'],
);

const filters = {
  checkedTypes: new Set(['book', 'movie']),
  checkedStatuses: new Set(['queued', 'consuming']),
  recommendedOnly: false,
  typeFiltering: true,
  statusFiltering: true,
};

assert.equal(
  mediaMatches({ type: 'book', status: 'queued', recommended: false }, filters),
  true,
);
assert.equal(
  mediaMatches({ type: 'show', status: 'queued', recommended: true }, filters),
  false,
);
assert.equal(
  mediaMatches({ type: 'movie', status: 'finished', recommended: true }, filters),
  false,
);
assert.equal(
  mediaMatches(
    { type: 'movie', status: 'queued', recommended: false },
    { ...filters, recommendedOnly: true },
  ),
  false,
);

console.log('Media filter facets and deep-link parsing behave correctly.');
