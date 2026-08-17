// Resolve a media URL or title to YAML entries that can be pasted into
// src/data/media.yaml. Stdout is always YAML; diagnostics stay on stderr.
//
// Plain text is a book search. Prefix other title searches with `album:`,
// `anime:`, or `manga:`. Pasted source URLs select their own resolver.

import { pathToFileURL } from 'node:url';
import { stringify } from 'yaml';

const USER_AGENT = 'legacycoder.net media authoring (https://legacycoder.net)';

const LIMIT = 5;

export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'media';
}

export function suggestedId(title, year) {
  return slugify([title, year].filter(Boolean).join('-'));
}

export function canonicalAmazonUrl(input) {
  const url = new URL(input);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!(hostname.startsWith('amazon.') || hostname.includes('.amazon.'))) {
    throw new Error(`Not an Amazon URL: ${input}`);
  }

  const match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:\/|$)/i);
  const asin = match?.[1] ?? url.searchParams.get('asin');
  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) {
    throw new Error('Could not find a 10-character ASIN in that Amazon URL.');
  }
  return `https://${hostname}/dp/${asin.toUpperCase()}`;
}

function yearFrom(value) {
  const match = String(value ?? '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function today() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== ''),
  );
}

function toEntry(candidate, added = today()) {
  return compact({
    id: suggestedId(candidate.title, candidate.year),
    title: candidate.title,
    type: candidate.type,
    status: 'queued',
    recommended: false,
    creator: candidate.creator,
    year: candidate.year,
    added,
    link: candidate.link,
  });
}

export function entriesForCandidates(candidates, added = today()) {
  const ids = new Map();
  return candidates.map((candidate) => {
    const entry = toEntry(candidate, added);
    const seen = ids.get(entry.id) ?? 0;
    ids.set(entry.id, seen + 1);
    if (seen) entry.id = `${entry.id}-${seen + 1}`;
    return entry;
  });
}

export function formatCandidates(candidates, added = today()) {
  return stringify(entriesForCandidates(candidates, added), { lineWidth: 0 }).trimEnd();
}

async function fetchJson(url, options = {}, fetchImpl = fetch) {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('User-Agent', USER_AGENT);
  let response;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetchImpl(url, { ...options, headers });
      if (response.ok) return response.json();
      lastError = new Error(
        `${new URL(url).hostname} answered ${response.status} ${response.statusText}`,
      );
      if (![429, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw lastError;
}

export function inferWikipediaType(page) {
  const primary = `${page.title ?? ''} ${page.extract ?? ''}`.toLowerCase();
  const categories = (page.categories ?? [])
    .map((category) => category.title)
    .join(' ')
    .toLowerCase();

  const classify = (text) => {
    if (/films?|movies?/.test(text)) return 'movie';
    if (/television|tv series|anime series|miniseries/.test(text)) return 'show';
    if (/novels?|books?|manga series|short stor/.test(text)) return 'book';
    if (/albums?|\beps?\b|soundtracks?/.test(text)) return 'album';
    if (/video games?|computer games?/.test(text)) return 'game';
    if (/podcasts?/.test(text)) return 'podcast';
    if (/videos?|youtube/.test(text)) return 'video';
    return undefined;
  };

  const inferred = classify(primary) ?? classify(categories);
  if (inferred) return inferred;
  throw new Error(
    `Could not infer a media type for Wikipedia page "${page.title}". ` +
      'Use a more specific source URL.',
  );
}

async function resolveWikipedia(input, fetchImpl) {
  const source = new URL(input);
  const titleMatch = source.pathname.match(/^\/wiki\/(.+)$/);
  if (!titleMatch) throw new Error('Expected a Wikipedia article URL containing /wiki/.');

  const api = new URL('/w/api.php', source.origin);
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('formatversion', '2');
  api.searchParams.set('redirects', '1');
  api.searchParams.set('prop', 'info|categories|extracts');
  api.searchParams.set('inprop', 'url');
  api.searchParams.set('cllimit', 'max');
  api.searchParams.set('exintro', '1');
  api.searchParams.set('explaintext', '1');
  api.searchParams.set('titles', decodeURIComponent(titleMatch[1]).replaceAll('_', ' '));

  const data = await fetchJson(api, {}, fetchImpl);
  const page = data.query?.pages?.[0];
  if (!page || page.missing) throw new Error('Wikipedia did not return that article.');
  return [{
    title: page.title.replace(/\s+\([^)]*\)$/, ''),
    type: inferWikipediaType(page),
    year: yearFrom(`${page.title} ${page.extract}`),
    link: page.fullurl ?? input,
  }];
}

async function openLibraryAuthor(key, fetchImpl) {
  if (!key) return undefined;
  const author = await fetchJson(`https://openlibrary.org${key}.json`, {}, fetchImpl);
  return author.name;
}

async function resolveOpenLibraryUrl(input, fetchImpl) {
  const source = new URL(input);
  const path = source.pathname.replace(/\/$/, '');
  if (!/^\/(?:works|books)\/OL[0-9A-Z]+$/i.test(path)) {
    throw new Error('Expected an Open Library work or edition URL.');
  }
  const data = await fetchJson(`https://openlibrary.org${path}.json`, {}, fetchImpl);
  const authorKey = data.authors?.[0]?.author?.key ?? data.authors?.[0]?.key;
  return [{
    title: data.title,
    type: 'book',
    creator: await openLibraryAuthor(authorKey, fetchImpl),
    year: yearFrom(data.first_publish_date ?? data.publish_date),
    link: `https://openlibrary.org${path}`,
  }];
}

async function searchOpenLibrary(query, fetchImpl) {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('title', query);
  url.searchParams.set('limit', '25');
  url.searchParams.set(
    'fields',
    'key,title,author_name,first_publish_year,edition_count',
  );
  const data = await fetchJson(url, {}, fetchImpl);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const books = [...(data.docs ?? [])].sort((a, b) => {
    const aExact = a.title?.trim().toLocaleLowerCase() === normalizedQuery;
    const bExact = b.title?.trim().toLocaleLowerCase() === normalizedQuery;
    if (aExact !== bExact) return aExact ? -1 : 1;
    if (aExact) return (b.edition_count ?? 0) - (a.edition_count ?? 0);
    return 0;
  });
  return books.slice(0, LIMIT).map((book) => ({
    title: book.title,
    type: 'book',
    creator: book.author_name?.[0],
    year: book.first_publish_year,
    link: `https://openlibrary.org${book.key}`,
  }));
}

function musicBrainzCreator(credit = []) {
  return credit
    .map((item) => `${item.name ?? item.artist?.name ?? ''}${item.joinphrase ?? ''}`)
    .join('');
}

function musicBrainzCandidate(group) {
  return {
    title: group.title,
    type: 'album',
    creator: musicBrainzCreator(group['artist-credit']),
    year: yearFrom(group['first-release-date']),
    link: `https://musicbrainz.org/release-group/${group.id}`,
  };
}

async function resolveMusicBrainzUrl(input, fetchImpl) {
  const id = new URL(input).pathname.match(/^\/release-group\/([0-9a-f-]{36})/i)?.[1];
  if (!id) throw new Error('Expected a MusicBrainz release-group URL.');
  const url = new URL(`https://musicbrainz.org/ws/2/release-group/${id}`);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('inc', 'artist-credits');
  const group = await fetchJson(url, {}, fetchImpl);
  return [musicBrainzCandidate(group)];
}

async function searchMusicBrainz(query, fetchImpl) {
  const url = new URL('https://musicbrainz.org/ws/2/release-group/');
  url.searchParams.set('query', query);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(LIMIT));
  const data = await fetchJson(url, {}, fetchImpl);
  return (data['release-groups'] ?? []).map(musicBrainzCandidate);
}

function jikanType(kind, format) {
  if (kind === 'manga') return 'book';
  return String(format).toLowerCase() === 'movie' ? 'movie' : 'show';
}

async function resolveMyAnimeList(input, fetchImpl) {
  const match = new URL(input).pathname.match(/^\/(anime|manga)\/(\d+)/);
  if (!match) throw new Error('Expected a MyAnimeList anime or manga URL.');
  const [, kind, id] = match;
  try {
    const response = await fetchJson(
      `https://api.jikan.moe/v4/${kind}/${id}/full`,
      {},
      fetchImpl,
    );
    const media = response.data;
    return [{
      title: media.title_english ?? media.title,
      type: jikanType(kind, media.type),
      creator: kind === 'anime' ? media.studios?.[0]?.name : media.authors?.[0]?.name,
      year: media.year ?? yearFrom(media.published?.from),
      link: media.url,
    }];
  } catch (error) {
    console.error(`Jikan lookup failed (${error.message}); trying AniList by MAL id.`);
    const fallback = await resolveAniList({ idMal: Number(id), kind }, fetchImpl);
    return fallback.map((candidate) => ({ ...candidate, link: input }));
  }
}

const ANILIST_QUERY = `
  query MediaMeta($id: Int, $idMal: Int, $search: String, $type: MediaType) {
    Page(page: 1, perPage: 5) {
      media(id: $id, idMal: $idMal, search: $search, type: $type, sort: SEARCH_MATCH) {
        id
        type
        format
        title { english romaji }
        startDate { year }
        siteUrl
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

async function resolveAniList({ id, idMal, search, kind }, fetchImpl) {
  const data = await fetchJson(
    'https://graphql.anilist.co',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { id, idMal, search, type: kind === 'manga' ? 'MANGA' : 'ANIME' },
      }),
    },
    fetchImpl,
  );
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return (data.data?.Page?.media ?? []).map((media) => ({
    title: media.title.english ?? media.title.romaji,
    type: media.type === 'MANGA' ? 'book' : media.format === 'MOVIE' ? 'movie' : 'show',
    creator: media.studios?.nodes?.[0]?.name,
    year: media.startDate?.year,
    link: media.siteUrl ?? `https://anilist.co/${kind}/${media.id}`,
  }));
}

async function resolveAniListUrl(input, fetchImpl) {
  const match = new URL(input).pathname.match(/^\/(anime|manga)\/(\d+)/);
  if (!match) throw new Error('Expected an AniList anime or manga URL.');
  return resolveAniList({ id: Number(match[2]), kind: match[1] }, fetchImpl);
}

async function resolveYouTube(input, fetchImpl) {
  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('url', input);
  url.searchParams.set('format', 'json');
  const data = await fetchJson(url, {}, fetchImpl);
  return [{
    title: data.title,
    type: 'video',
    creator: data.author_name,
    link: input,
  }];
}

function prefixedQuery(input) {
  const match = input.match(/^(book|album|anime|manga):\s*(.+)$/i);
  return match ? { kind: match[1].toLowerCase(), query: match[2].trim() } : null;
}

export async function resolveInput(input, fetchImpl = fetch) {
  const prefix = prefixedQuery(input);
  if (prefix) {
    if (!prefix.query) throw new Error(`The ${prefix.kind}: prefix needs a title.`);
    if (prefix.kind === 'book') return searchOpenLibrary(prefix.query, fetchImpl);
    if (prefix.kind === 'album') return searchMusicBrainz(prefix.query, fetchImpl);
    return resolveAniList({ search: prefix.query, kind: prefix.kind }, fetchImpl);
  }

  let source;
  try {
    source = new URL(input);
  } catch {
    return searchOpenLibrary(input, fetchImpl);
  }

  const hostname = source.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname.startsWith('amazon.') || hostname.includes('.amazon.')) {
    return canonicalAmazonUrl(input);
  }
  if (hostname.endsWith('wikipedia.org')) return resolveWikipedia(input, fetchImpl);
  if (hostname === 'openlibrary.org') return resolveOpenLibraryUrl(input, fetchImpl);
  if (hostname === 'musicbrainz.org') return resolveMusicBrainzUrl(input, fetchImpl);
  if (hostname === 'myanimelist.net') return resolveMyAnimeList(input, fetchImpl);
  if (hostname === 'anilist.co') return resolveAniListUrl(input, fetchImpl);
  if (hostname === 'youtube.com' || hostname === 'youtu.be') {
    return resolveYouTube(input, fetchImpl);
  }
  throw new Error(`No media metadata resolver for ${hostname}.`);
}

export async function runCli(args = process.argv.slice(2), fetchImpl = fetch) {
  const input = args.join(' ').trim();
  if (!input || input === '--help' || input === '-h') {
    const usage = [
      'Usage: npm run media-meta -- <url-or-title>',
      '       npm run media-meta -- "album: Selected Ambient Works 85-92"',
      '       npm run media-meta -- "anime: Cowboy Bebop"',
    ].join('\n');
    if (input) console.log(usage);
    else console.error(usage);
    return input ? 0 : 1;
  }

  const result = await resolveInput(input, fetchImpl);
  if (typeof result === 'string') {
    console.log(result);
    return 0;
  }
  if (!result.length) throw new Error(`No match for "${input}".`);
  if (result.length > 1) {
    console.error(`Found ${result.length} candidates; keep the entry you want.`);
  }
  console.log(formatCandidates(result));
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    process.exitCode = await runCli();
  } catch (error) {
    console.error(`media-meta: ${error.message}`);
    process.exitCode = 1;
  }
}
