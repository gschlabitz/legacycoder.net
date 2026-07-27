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
 * Two values, matching the two editorial choices a page can make:
 *
 * - a tune name — the page's Declared tune
 * - `false` — a Silent page, which refuses music and overrides the reader
 *
 * Omitting `music` is the third, commonest case: the page declares nothing, so
 * a reader on Auto hears nothing here, while an explicit pick still plays.
 */
export function pulsarSchema() {
  return z.object({
    music: z.union([z.string(), z.literal(false)]).optional(),
  })
}

export type PulsarFrontmatter = z.infer<ReturnType<typeof pulsarSchema>>
