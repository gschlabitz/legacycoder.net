import assert from 'node:assert/strict';
import { parse } from 'yaml';
import {
  frontmatterBlock,
  parseArgs,
  parseArtist,
  slugify,
  spdxLicense,
} from '../scripts/plant-meta.mjs';

assert.equal(slugify("Pelargonium 'citrosum'"), 'pelargonium-citrosum');
assert.equal(slugify('Thymus vulgaris'), 'thymus-vulgaris');

// Commons Artist values are HTML; protocol-relative and site-relative hrefs
// both resolve to absolute Commons URLs.
assert.deepEqual(
  parseArtist('<a href="//commons.wikimedia.org/wiki/User:Misaochan">Misaochan</a>'),
  { name: 'Misaochan', url: 'https://commons.wikimedia.org/wiki/User:Misaochan' },
);
assert.deepEqual(
  parseArtist('<a href="/wiki/User:Jeangagnon">Jeangagnon</a>'),
  { name: 'Jeangagnon', url: 'https://commons.wikimedia.org/wiki/User:Jeangagnon' },
);
assert.deepEqual(parseArtist('Donovan Govan.'), { name: 'Donovan Govan.', url: undefined });
// Entity-encoded redlink hrefs (author page doesn't exist) carry no URL.
assert.deepEqual(
  parseArtist(
    '<a href="//commons.wikimedia.org/w/index.php?title=User:Mokkie&amp;action=edit&amp;redlink=1">Mokkie</a>',
  ),
  { name: 'Mokkie', url: undefined },
);
assert.deepEqual(parseArtist(undefined), { name: 'Unknown' });

assert.equal(spdxLicense('CC BY-SA 4.0'), 'CC-BY-SA-4.0');
assert.equal(spdxLicense('CC BY 2.0'), 'CC-BY-2.0');
assert.equal(spdxLicense('CC0'), 'CC0-1.0');
assert.equal(spdxLicense('Public domain'), 'Public-Domain');
assert.equal(spdxLicense('GFDL 1.2'), 'GFDL-1.2');

assert.deepEqual(
  parseArgs(['Thymus', 'vulgaris', '--slug', 'german-thyme', '--skip-download']),
  { name: 'Thymus vulgaris', slug: 'german-thyme', skipDownload: true },
);
assert.deepEqual(
  parseArgs(['Ocimum', 'basilicum', '--image', 'File:Basil.jpg']),
  { name: 'Ocimum basilicum', image: 'File:Basil.jpg', skipDownload: false },
);

// The printed block must round-trip as YAML and carry the structured care
// skeleton the content schema expects.
const block = parse(
  frontmatterBlock({
    taxon: { binomial: 'Thymus vulgaris', family: 'Lamiaceae', genus: 'Thymus' },
    page: { title: 'Thymus vulgaris' },
  }),
);
assert.equal(block.plant.binomial, 'Thymus vulgaris');
assert.equal(block.plant.family, 'Lamiaceae');
assert.deepEqual(Object.keys(block.plant.care), ['watering', 'fertilizing', 'repotting']);
assert.equal(block.plant.care.repotting.unit, 'years');
assert.equal(block.plant.schedule, true);

console.log('plant-meta tests passed');
