import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';

// TASL attribution metadata (Creative Commons' recommended model:
// Title, Author, Source, License) for reusable assets in src/assets.
// Each entry is a sidecar `<image>.json` file living next to its image.
const tasl = z.object({
  title: z.string(),
  author: z.object({
    name: z.string(),
    url: z.string().url().optional(),
  }),
  source: z.string().url(),
  // Optional friendly name for the source link, e.g. "Wikimedia Commons".
  // Falls back to the source hostname when omitted.
  sourceName: z.string().optional(),
  // SPDX-style identifier, e.g. "CC-BY-3.0".
  license: z.string(),
  licenseUrl: z.string().url(),
  // Whether the asset was modified from the original (required credit for
  // ShareAlike / derivative licenses).
  modified: z.boolean().default(false),
});

// Auto-biography timeline. One Markdown file per life event under
// src/content/timeline/; the Markdown body is the event description. Powers
// the custom /bio page (src/pages/bio.astro), not a Starlight docs route.
const timeline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/timeline' }),
  schema: z.object({
    // Frontmatter date as YYYY-MM-DD; coerced to a Date for sorting/grouping.
    date: z.coerce.date(),
    title: z.string(),
    // Which half of the split timeline the event renders on — the page is
    // organized around the work/life-balance metaphor. Explicit rather than
    // derived from tags, since an event can carry tags from both spheres.
    sphere: z.enum(['work', 'life']),
    // Fixed tag vocabulary — these are the filter dimensions the landing
    // page links into (/bio/?tags=…). A tag may have no events yet.
    tags: z
      .array(z.enum(['career', 'skills', 'family', 'travel', 'hobby']))
      .default([]),
    // Where the event happened. Required: the timeline map's camera track
    // runs through every event's pin, so an event without coordinates would
    // be a hole in the track — the build/dev server errors on the file until
    // the author fills it in. The display label is derived, not stored:
    // "city, (state ?? country)" — so US events set `state` and omit
    // `country`, events abroad set `country` and skip the state ("Potsdam,
    // Germany", not "Potsdam, Brandenburg"). `npm run geocode` prints a
    // paste-ready block following these conventions.
    location: z.object({
      // Street address, kept for precision/reference; never displayed.
      address: z.string().optional(),
      city: z.string(),
      // First-level division: US state, Bundesland, province…
      state: z.string().optional(),
      country: z.string().optional(),
      // A string — leading zeros matter, so quote it in YAML.
      postalCode: z.string().optional(),
      lat: z.number(),
      lng: z.number(),
    }),
    // Slug under src/content/docs/blog/ for the migrated post that tells the
    // full story of this event, if one exists.
    post: z.string().optional(),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: (context) => blogSchema(context) }) }),
  timeline,
  credits: defineCollection({
    loader: glob({
      pattern: '**/*.{png,jpg,jpeg,webp,avif,gif,svg}.json',
      base: './src/assets',
      // Use the image filename verbatim as the id (strip only the `.json`),
      // so <Figure src="…"> and getEntry() key on the same string.
      generateId: ({ entry }) => entry.replace(/\.json$/, ''),
    }),
    schema: tasl,
  }),
};
