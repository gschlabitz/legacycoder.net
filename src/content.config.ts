import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';
import { mediaEntrySchema } from './lib/media-schema';

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

// One recurring care task for a potted plant. `every`/`unit` are structured
// (not prose) so a future calendar/reminder system can compute due dates.
// `months` bounds the task to part of the year (1–12, e.g. [3,...,10] for a
// March–October feeding window); omit it for year-round tasks. `note` is the
// only per-locale field — everything else is a fact, mirrored verbatim to the
// German counterpart file.
const careTask = z.object({
  every: z.number().int().positive(),
  unit: z.enum(['days', 'weeks', 'months', 'years']),
  months: z.array(z.number().int().min(1).max(12)).optional(),
  note: z.string().optional(),
});

// Botanical facts and care schedule for a potted-plant page. Pages set
// `culinary`/`medicinal` when they carry an "In the kitchen" / "Home
// medicine" section in the body; the flags are facts, the sections are
// per-locale prose. `npm run plant-meta` prints a paste-ready block and
// fetches a Commons image with its TASL sidecar.
const plant = z.object({
  binomial: z.string(),
  family: z.string(),
  genus: z.string(),
  // Localized common names — words, so per-locale, not mirrored.
  commonNames: z.array(z.string()).default([]),
  origin: z.string().optional(),
  light: z.string().optional(),
  temperature: z.string().optional(),
  care: z.object({
    watering: careTask,
    fertilizing: careTask,
    // Optional — not every plant gets cut back (parsley is harvested, not trimmed).
    trimming: careTask.optional(),
    repotting: careTask,
  }),
  // Opt-in to the care dashboard on the plants index — pots actually being
  // kept, as opposed to reference-only pages.
  schedule: z.boolean().default(false),
  culinary: z.boolean().default(false),
  medicinal: z.boolean().default(false),
});

// One day of the materialized care schedule (src/data/care-calendar.yaml,
// regenerated with `npm run care-calendar`): plant slugs per due task, keyed
// by ISO date. The calendar page renders this fixed data — it computes no
// schedules itself.
const careDay = z.object({
  watering: z.array(z.string()).optional(),
  fertilizing: z.array(z.string()).optional(),
  trimming: z.array(z.string()).optional(),
  repotting: z.array(z.string()).optional(),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: (context) => blogSchema(context).merge(z.object({
        location: location.optional(),
        skills: z.array(z.string()).optional(),
        plant: plant.optional(),
        // Full-page wallpaper behind the content, rendered by the
        // PageFrame override (src/components/PageFrame.astro). Path is
        // relative to the content file, e.g. ../../../assets/foo.jpg.
        backgroundImage: context.image().optional(),
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
  media: defineCollection({
    loader: file('./src/data/media.yaml'),
    schema: mediaEntrySchema,
  }),
  careCalendar: defineCollection({
    loader: file('./src/data/care-calendar.yaml'),
    schema: careDay,
  }),
};
