# Retire the `skills` tag; replace with a YAML skill registry

The `skills` tag existed as a placeholder before real skills infrastructure.
It was one of five closed-vocabulary tags in `TIMELINE_TAGS` and assigned
a graduation-cap pin icon via `TAG_ICONS`. It filed events under the "life"
sphere (only `career` → work) and powered the landing page's "Skills" hero
button, which linked to `/bio/?tags=skills`.

This tag is retired because:

- Skills are personal achievements applicable across work and life contexts,
  so they don't fit the tag vocabulary (which derives the work/life sphere).
- A single tag can't represent 74+ individual skills with their own metadata
  (years active, bilingual notes).
- The tag was a placeholder — it predates any real skills infrastructure.

The replacement is a YAML skill registry (`src/data/skills.yaml`) and
per-event skill associations (the `skills` frontmatter field on blog posts).
Skills now have their own pages (`/skills/`, `/skills/{id}`) and appear as
chips on timeline events.

Consequences:

- The tag vocabulary shrinks from five to four: `career`, `family`,
  `travel`, `hobby`.
- The graduation-cap pin icon is removed from `TAG_ICONS`.
- The landing page "Skills" / "Kompetenzen" buttons now link to `/skills/`
  instead of `/bio/?tags=skills`.
- The two blog posts previously tagged `skills` had the tag removed and
  replaced with `skills` frontmatter entries when the full skill list is added.
