import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

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

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
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
