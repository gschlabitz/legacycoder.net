import { z } from 'astro:content';

// These vocabularies drive validation. A media type only appears on /media
// when it also has a TYPE_HEADERS entry (emoji + label) in
// src/pages/media.astro.
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
  post: z.string().min(1).optional(),
});
