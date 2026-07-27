import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';
import { pulsarSchema } from 'starlight-pulsar/schema';

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

// Where a blog post happened (every post is a timeline event — ADR-0004).
// Optional here because the docs collection also holds ordinary docs pages;
// the real rule — published posts must have coordinates so the timeline
// map's camera track has no holes, drafts are exempt — is enforced by the
// build-time check in src/lib/timeline.ts. The display label is derived,
// not stored: "city, (state ?? country)" — so US events set `state` and
// omit `country`, events abroad set `country` and skip the state
// ("Potsdam, Germany", not "Potsdam, Brandenburg"). `npm run geocode`
// prints a paste-ready block following these conventions.
const location = z.object({
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
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      // A Starlight plugin cannot extend the site's content schema — zod would
      // strip `music` before the tune selector ever saw it — so Pulsar's
      // fragment is merged here alongside the blog's.
      extend: (context) => blogSchema(context).merge(pulsarSchema()).merge(z.object({
        location: location.optional(),
        skills: z.array(z.string()).optional(),
      })),
    }),
  }),
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
