import { z } from 'astro/zod'

/**
 * The frontmatter fragment a Pulsar site merges into its own content schema.
 *
 * A Starlight plugin cannot extend a site's content collection schema — zod
 * strips undeclared keys, so an unmerged `music` value would vanish before the
 * control ever sees it. The site merges this the same way it merges
 * `blogSchema()`:
 *
 * ```ts
 * schema: docsSchema({
 *   extend: (context) => blogSchema(context).merge(pulsarSchema()),
 * })
 * ```
 *
 * Three values, matching the editorial choices a page can make:
 *
 * - a tune name — the page's one-tune playlist
 * - a non-empty array of tune names — an ordered playlist with skip controls
 * - `false` — an explicitly silent page
 *
 * Omitting `music` is the commonest case: the page offers no music.
 */
export function pulsarSchema() {
  return z.object({
    music: z.union([z.string(), z.array(z.string()).min(1), z.literal(false)]).optional(),
  })
}

export type PulsarFrontmatter = z.infer<ReturnType<typeof pulsarSchema>>
