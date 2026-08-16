// Resolve a plant name to a paste-ready `plant:` frontmatter block for a
// potted-plant page, and fetch its Wikimedia Commons lead image with the
// TASL sidecar that <Figure> requires. Stdout is always YAML; diagnostics
// stay on stderr.
//
// Usage:
//   npm run plant-meta -- "Petroselinum crispum"
//   npm run plant-meta -- "Thymus vulgaris" --slug german-thyme
//   npm run plant-meta -- "Ocimum basilicum" --image "File:Basil-Basilico-Ocimum_basilicum-albahaca.jpg"
//   npm run plant-meta -- "Cymbopogon nardus" --skip-download
//
// Taxonomy comes from GBIF, the summary and lead image from Wikipedia, and
// the image's attribution from the Commons API — all keyless services.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stringify } from 'yaml';

const USER_AGENT = 'legacycoder.net plant authoring (https://legacycoder.net)';
const ASSETS_DIR = 'src/assets/plants';

export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'plant';
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

// GBIF's fuzzy species match: binomial, family, and genus in one request.
async function matchGbif(name, fetchImpl) {
  const url = new URL('https://api.gbif.org/v1/species/match');
  url.searchParams.set('name', name);
  const data = await fetchJson(url, {}, fetchImpl);
  if (data.matchType === 'NONE') {
    throw new Error(`GBIF found no taxon matching "${name}".`);
  }
  return {
    binomial: data.canonicalName ?? name,
    family: data.family,
    genus: data.genus,
  };
}

// English Wikipedia: intro extract plus the lead image's Commons filename.
async function wikipediaPage(name, fetchImpl) {
  const api = new URL('https://en.wikipedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('formatversion', '2');
  api.searchParams.set('redirects', '1');
  api.searchParams.set('generator', 'search');
  api.searchParams.set('gsrsearch', name);
  api.searchParams.set('gsrlimit', '1');
  api.searchParams.set('prop', 'info|pageimages|extracts');
  api.searchParams.set('inprop', 'url');
  api.searchParams.set('piprop', 'name');
  api.searchParams.set('exintro', '1');
  api.searchParams.set('explaintext', '1');
  const data = await fetchJson(api, {}, fetchImpl);
  const page = data.query?.pages?.[0];
  if (!page || page.missing) {
    throw new Error(`Wikipedia has no article matching "${name}".`);
  }
  return {
    title: page.title,
    url: page.fullurl,
    extract: page.extract,
    imageFile: page.pageimage ? `File:${page.pageimage}` : undefined,
  };
}

// Strip an extmetadata HTML value (e.g. Artist) down to text plus the first
// link, which on Commons is the author's user page.
export function parseArtist(html) {
  if (!html) return { name: 'Unknown' };
  const raw = html.match(/href="([^"]+)"/)?.[1];
  const decoded = raw
    ?.replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"');
  // A redlink is a page that doesn't exist — no point crediting a URL that
  // renders an empty edit form.
  const href = decoded?.includes('redlink=1') ? undefined : decoded;
  const name = html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const url = !href
    ? undefined
    : /^https?:\/\//.test(href)
      ? href
      : href.startsWith('//')
        ? `https:${href}`
        : `https://commons.wikimedia.org${href}`;
  return { name: name || 'Unknown', url };
}

// "CC BY-SA 4.0" → "CC-BY-SA-4.0"; anything unrecognized passes through so
// the sidecar still validates and the caption shows the raw label.
export function spdxLicense(shortName) {
  if (!shortName) return 'Unknown';
  const cc = shortName.match(/^CC\s+(BY(?:-[A-Z]+)*)\s+([\d.]+)$/i);
  if (cc) return `CC-${cc[1].toUpperCase()}-${cc[2]}`;
  if (/^CC0/i.test(shortName)) return 'CC0-1.0';
  if (/public domain/i.test(shortName)) return 'Public-Domain';
  return shortName.replace(/\s+/g, '-');
}

// Commons imageinfo: original URL plus the attribution fields TASL needs.
async function commonsImage(file, fetchImpl) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('formatversion', '2');
  api.searchParams.set('titles', file);
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|extmetadata');
  const data = await fetchJson(api, {}, fetchImpl);
  const info = data.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) throw new Error(`Commons has no image named "${file}".`);
  const meta = info.extmetadata ?? {};
  return {
    url: info.url,
    descriptionUrl: info.descriptionurl,
    title: meta.ObjectName?.value?.trim() || file.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
    artist: parseArtist(meta.Artist?.value),
    license: spdxLicense(meta.LicenseShortName?.value),
    licenseUrl: meta.LicenseUrl?.value ?? 'https://commons.wikimedia.org/wiki/Commons:Licensing',
  };
}

async function downloadImage(url, destination, fetchImpl) {
  const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Downloading ${url} failed: ${response.status} ${response.statusText}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function sidecar(image) {
  return {
    title: image.title,
    author: {
      name: image.artist.name,
      ...(image.artist.url ? { url: image.artist.url } : {}),
    },
    source: image.descriptionUrl,
    sourceName: 'Wikimedia Commons',
    license: image.license,
    licenseUrl: image.licenseUrl,
    modified: false,
  };
}

// A schedule skeleton with deliberately conservative placeholders — the
// numbers are the author's call per plant, not something an API knows.
const CARE_TEMPLATE = {
  watering: { every: 7, unit: 'days', note: 'TODO' },
  fertilizing: { every: 4, unit: 'weeks', months: [3, 4, 5, 6, 7, 8, 9, 10], note: 'TODO' },
  repotting: { every: 1, unit: 'years', months: [3, 4], note: 'TODO' },
};

export function frontmatterBlock({ taxon, page }) {
  return stringify(
    {
      plant: {
        binomial: taxon.binomial,
        family: taxon.family,
        genus: taxon.genus,
        commonNames: [page.title],
        origin: 'TODO',
        light: 'TODO',
        temperature: 'TODO',
        care: CARE_TEMPLATE,
        // A new page is normally a pot being kept — flip to false for
        // reference-only pages, which stay off the care dashboard.
        schedule: true,
        culinary: false,
        medicinal: false,
      },
    },
    { lineWidth: 0 },
  ).trimEnd();
}

export function parseArgs(args) {
  const options = { skipDownload: false };
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--slug') options.slug = args[++index];
    else if (arg === '--image') options.image = args[++index];
    else if (arg === '--skip-download') options.skipDownload = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else positional.push(arg);
  }
  options.name = positional.join(' ').trim();
  return options;
}

export async function runCli(args = process.argv.slice(2), fetchImpl = fetch) {
  const options = parseArgs(args);
  if (!options.name || options.help) {
    const usage = [
      'Usage: npm run plant-meta -- <plant-name> [--slug <name>] [--image "File:…"] [--skip-download]',
      '       npm run plant-meta -- "Thymus vulgaris" --slug german-thyme',
    ].join('\n');
    console.error(usage);
    return options.help ? 0 : 1;
  }

  const [taxon, page] = await Promise.all([
    matchGbif(options.name, fetchImpl),
    wikipediaPage(options.name, fetchImpl),
  ]);
  console.error(`Matched: ${taxon.binomial} (${page.url})`);

  const file = options.image ?? page.imageFile;
  if (file) {
    const image = await commonsImage(file, fetchImpl);
    const slug = options.slug ?? slugify(taxon.binomial);
    const extension = path.extname(new URL(image.url).pathname).toLowerCase() || '.jpg';
    const filename = `${slug}${extension}`;
    const destination = path.join(ASSETS_DIR, filename);
    if (options.skipDownload) {
      console.error(`Image: ${image.url} (skipped download)`);
    } else {
      await downloadImage(image.url, destination, fetchImpl);
      fs.writeFileSync(
        `${destination}.json`,
        `${JSON.stringify(sidecar(image), null, 2)}\n`,
      );
      console.error(`Saved ${destination} and its TASL sidecar.`);
    }
    console.error(`Credit: ${image.artist.name}, ${image.license}`);
  } else {
    console.error('Wikipedia lists no lead image; pass one with --image "File:…".');
  }

  console.log(frontmatterBlock({ taxon, page }));
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    process.exitCode = await runCli();
  } catch (error) {
    console.error(`plant-meta: ${error.message}`);
    process.exitCode = 1;
  }
}
