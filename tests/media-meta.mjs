import assert from 'node:assert/strict';
import { parse } from 'yaml';
import {
  canonicalAmazonUrl,
  formatCandidates,
  inferWikipediaType,
  resolveInput,
  slugify,
  suggestedId,
} from '../scripts/media-meta.mjs';

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

assert.equal(slugify('The City & The City'), 'the-city-and-the-city');
assert.equal(suggestedId('Dune', 1965), 'dune-1965');
assert.equal(
  canonicalAmazonUrl('https://www.amazon.com/Some-Title/dp/034549752X?tag=nope'),
  'https://amazon.com/dp/034549752X',
);
assert.equal(
  canonicalAmazonUrl('https://amazon.co.uk/gp/product/B012345678/ref=something'),
  'https://amazon.co.uk/dp/B012345678',
);
assert.equal(
  inferWikipediaType({ title: 'Blade Runner', categories: [{ title: '1982 films' }] }),
  'movie',
);

const openLibraryFetch = async (url) => {
  assert.match(String(url), /^https:\/\/openlibrary\.org\/search\.json/);
  return json({
    docs: [
      {
        key: '/works/OL893415W',
        title: 'Dune',
        author_name: ['Frank Herbert'],
        first_publish_year: 1965,
        edition_count: 100,
      },
    ],
  });
};
const books = await resolveInput('Dune', openLibraryFetch);
assert.equal(books[0].type, 'book');
assert.equal(books[0].creator, 'Frank Herbert');
const bookYaml = formatCandidates(books, '2026-08-09');
assert.deepEqual(parse(bookYaml), [
  {
    id: 'dune-1965',
    title: 'Dune',
    type: 'book',
    status: 'queued',
    recommended: false,
    creator: 'Frank Herbert',
    year: 1965,
    added: '2026-08-09',
    link: 'https://openlibrary.org/works/OL893415W',
  },
]);

const wikipediaFetch = async (url) => {
  const request = new URL(url);
  assert.equal(request.hostname, 'en.wikipedia.org');
  assert.equal(request.searchParams.get('titles'), 'Blade Runner');
  return json({
    query: {
      pages: [{
        title: 'Blade Runner',
        extract: 'Blade Runner is a 1982 science fiction film.',
        fullurl: 'https://en.wikipedia.org/wiki/Blade_Runner',
        original: { source: 'https://upload.wikimedia.org/example.jpg' },
        categories: [{ title: 'Category:1982 films' }],
      }],
    },
  });
};
const wiki = await resolveInput(
  'https://en.wikipedia.org/wiki/Blade_Runner',
  wikipediaFetch,
);
assert.equal(wiki[0].type, 'movie');
assert.equal(wiki[0].year, 1982);
assert.equal(wiki[0].cover, undefined);

const musicBrainzFetch = async (url, options = {}) => {
  if (options.method === 'HEAD') return new Response(null, { status: 404 });
  assert.equal(new URL(url).hostname, 'musicbrainz.org');
  return json({
    'release-groups': [{
      id: 'f0a4ed09-2b2d-3ca8-9b24-90b96d3a67b7',
      title: 'Selected Ambient Works 85–92',
      'first-release-date': '1992-02-12',
      'artist-credit': [{ name: 'Aphex Twin' }],
    }],
  });
};
const albums = await resolveInput(
  'album: Selected Ambient Works 85-92',
  musicBrainzFetch,
);
assert.equal(albums[0].type, 'album');
assert.equal(albums[0].creator, 'Aphex Twin');

const jikanFetch = async (url) => {
  assert.equal(String(url), 'https://api.jikan.moe/v4/anime/1/full');
  return json({
    data: {
      title: 'Cowboy Bebop',
      type: 'TV',
      year: 1998,
      url: 'https://myanimelist.net/anime/1/Cowboy_Bebop',
      studios: [{ name: 'Sunrise' }],
      images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/bebop.jpg' } },
    },
  });
};
const mal = await resolveInput(
  'https://myanimelist.net/anime/1/Cowboy_Bebop',
  jikanFetch,
);
assert.equal(mal[0].type, 'show');
assert.equal(mal[0].cover, undefined);

const aniListFetch = async (url, options) => {
  assert.equal(String(url), 'https://graphql.anilist.co');
  assert.equal(JSON.parse(options.body).variables.type, 'ANIME');
  return json({
    data: {
      Page: {
        media: [{
          id: 1,
          type: 'ANIME',
          format: 'TV',
          title: { english: 'Cowboy Bebop', romaji: 'Cowboy Bebop' },
          startDate: { year: 1998 },
          siteUrl: 'https://anilist.co/anime/1',
          studios: { nodes: [{ name: 'Sunrise' }] },
        }],
      },
    },
  });
};
const anime = await resolveInput('anime: Cowboy Bebop', aniListFetch);
assert.equal(anime[0].type, 'show');
assert.equal(anime[0].cover, undefined);

const youtubeFetch = async (url) => {
  assert.equal(new URL(url).pathname, '/oembed');
  return json({
    title: 'The Internet',
    author_name: 'Computer Chronicles',
    thumbnail_url: 'https://i.ytimg.com/example.jpg',
  });
};
const videos = await resolveInput(
  'https://www.youtube.com/watch?v=95-yZ-31j9A',
  youtubeFetch,
);
assert.equal(videos[0].type, 'video');
assert.equal(videos[0].cover, undefined);

console.log('Media metadata routing, normalization, and YAML output behave correctly.');
