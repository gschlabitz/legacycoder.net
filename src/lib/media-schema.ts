import { z } from 'astro:content';

// These vocabularies drive validation, filter options, and fallback glyphs.
// Adding a media type also requires a matching TYPE_ICONS entry in
// src/lib/media-icons.js.
export const mediaTypeSchema = z.enum([
  'book',
  'show',
  'movie',
  'video',
  'album',
  'game',
  'podcast',
]);

export const mediaStatusSchema = z.enum([
  'queued',
  'consuming',
  'finished',
  'abandoned',
]);

export const MEDIA_TYPES = mediaTypeSchema.options;
export const MEDIA_STATUSES = mediaStatusSchema.options;

export const mediaEntrySchema = z.object({
  id: z.string().regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use a lowercase, hyphen-separated media id.',
  ),
  title: z.string().min(1),
  type: mediaTypeSchema,
  status: mediaStatusSchema,
  recommended: z.boolean().default(false),
  creator: z.string().min(1).optional(),
  year: z.number().int().min(1000).max(9999).optional(),
  added: z.coerce.date(),
  finished: z.coerce.date().optional(),
  link: z.string().url(),
  cover: z.string().url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  note: z.object({ en: z.string().min(1) }).catchall(z.string().min(1)).optional(),
  post: z.string().min(1).optional(),
});
