import assert from 'node:assert/strict';
import {
  facetState,
  mediaMatches,
  queryText,
  queryValues,
} from '../src/lib/media-filter.js';

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
assert.equal(queryText('?year=2020&byline=Christopher%20Nolan', 'year'), '2020');
assert.equal(
  queryText('?year=2020&byline=Christopher%20Nolan', 'byline'),
  'Christopher Nolan',
);
assert.deepEqual(facetState(0, 3), { checked: false, indeterminate: false });
assert.deepEqual(facetState(1, 3), { checked: false, indeterminate: true });
assert.deepEqual(facetState(3, 3), { checked: true, indeterminate: false });

const filters = {
  checkedTypes: new Set(['book', 'movie']),
  checkedStatuses: new Set(['queued', 'consuming']),
  recommendedOnly: false,
  typeFiltering: true,
  statusFiltering: true,
  yearQuery: '',
  bylineQuery: '',
};

assert.equal(
  mediaMatches({ type: 'book', status: 'queued', recommended: false }, filters),
  true,
);

const tenet = {
  type: 'movie',
  status: 'queued',
  recommended: false,
  year: '2020',
  byline: 'Christopher Nolan',
};

assert.equal(mediaMatches(tenet, { ...filters, yearQuery: '2020' }), true);
assert.equal(mediaMatches(tenet, { ...filters, yearQuery: '202' }), false);
assert.equal(mediaMatches(tenet, { ...filters, bylineQuery: 'nolan' }), true);
assert.equal(mediaMatches(tenet, { ...filters, bylineQuery: 'NOLAN' }), true);
assert.equal(mediaMatches(tenet, { ...filters, bylineQuery: 'Scott' }), false);
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
