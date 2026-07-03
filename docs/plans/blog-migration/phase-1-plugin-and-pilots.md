# Phase 1 — replace theme, starlight-blog plugin + 3 pilot posts + timeline link field

Read `README.md` in this directory first. Goal: swap the theme, then prove
the whole migration stack on three hand-migrated posts and get user sign-off
on the format before anything is bulk-generated.

## Deliverables

1. `starlight-theme-galaxy` removed (README decision 5); the site renders on
   the replacement theme with no leftover Galaxy imports or workarounds.
2. `starlight-blog` installed, configured, rendering at `/blog` without
   breaking the existing pages (`/`, `/bio`, `/pfeffer`, `/links`,
   `/recipes`, `/llm-notebook/*`).
3. Three pilot posts migrated by hand (listed below), pixel-faithful to the
   originals: images rehosted, cross-link and dead-video treatments
   demonstrated. Comments are not migrated (README decision 3).
4. Timeline events support an optional link to a blog post, demonstrated on
   one event.
5. User has seen screenshots of all three posts and approved the format.

## Step 1: Remove the Galaxy theme

Ask the user ONE question before touching anything: default Starlight theme,
or a specific replacement? (Default assumption per README decision 5:
default Starlight + the blog plugin's own styling.) Then:

1. Remove `starlightThemeGalaxy()` and its import from `astro.config.mjs`;
   `npm uninstall starlight-theme-galaxy`.
2. **`src/components/ThemeSelect.astro` hard-imports
   `starlight-theme-galaxy/overrides/ThemeSelect.astro`** — the build breaks
   on uninstall until it's rewritten. It exists to place the reading-mode
   toggle next to the theme toggle; rewrite it to wrap Starlight's default
   component (`@astrojs/starlight/components/ThemeSelect.astro`) with the
   same slot structure, and verify the reading-mode toggle still appears and
   works (it persists via `localStorage` key `lc:reading-mode`).
3. Re-evaluate Galaxy-specific CSS workarounds — remove them if the reason
   is gone, keep them if they're now harmless-but-load-bearing (check each
   visually, don't guess):
   - `src/styles/bio.css` — the `.tl-sphere::before, .tl-year-heading::before
     { content: none; }` block exists only to kill Galaxy's h2 gradient
     underline.
   - `src/styles/pfeffer.css` — top-of-file comment: a vertical-align
     workaround for Galaxy's table styles.
   - `src/styles/reading-mode.css` — toggle styling written to match Galaxy
     header buttons; restyle to match the new theme's header.
4. Regression pass over every page (`/`, `/bio` including the map banner and
   sticky year headers, `/pfeffer` score sheet, `/links`, `/recipes`,
   `/llm-notebook/*`) in light AND dark mode. The bio page is the riskiest:
   its sticky offsets use `--sl-nav-height`/`--sl-mobile-toc-height` and its
   colors use `--sl-color-*` variables — all fine on any Starlight theme in
   principle, but verify the WORK/LIFE header band and year pills still dock
   correctly.
5. Show the user before/after screenshots of `/` and `/bio` and get an
   explicit OK on the new look BEFORE proceeding to Step 2.

## Step 2: Install and configure the plugin

```sh
npm install starlight-blog
```

- Docs: https://github.com/HiDeoo/starlight-blog — check the README for the
  version compatible with Starlight 0.41. (Theme-ordering concerns are gone
  now that Galaxy is removed in Step 1; if the user chose a replacement
  theme there, check the blog plugin's docs for ordering relative to theme
  plugins.)
- Configure the author once globally: name "Guido Schlabitz", url
  `https://www.linkedin.com/in/guido-schlabitz/`.
- The plugin requires extending the docs schema in `src/content.config.ts`
  (`docsSchema({ extend: blogSchema(context) })` — copy the exact incantation
  from the plugin README for the installed version). **Restart the dev
  server after this edit.**
- Blog posts then live in `src/content/docs/blog/`. The `/blog` route, post
  routes, and prev/next links come from the plugin.
- Check how the plugin injects itself into the top nav/sidebar; if it adds a
  "Blog" link, that's the desired behavior.

## Step 3: Migrate the three pilot posts by hand

Fetch the feed (see README) and locate these three entries by their
`published` date. They were chosen to force every hard case:

| Post | Why chosen |
| --- | --- |
| 2005-05-24 "Das Neue Zuhause 2 - The New Home 2" | Has an image AND a cross-link to an earlier post ("wilde Hundebabys") |
| 2007-11-01 "Geburstagsvideo" | Dead Google-Video embed (the house-tour video for Guido's mother) |
| 2008-08-17 "Jackson Square" | Image-heavy travel post; will be linked from the "Road trip to New Orleans" timeline event in step 3 |

Per-post conversion rules (these become the Phase 2 spec, so follow them
exactly and note anything that doesn't fit):

- **Filename/slug**: `YYYY-MM-DD-<blogspot-slug>.md` where the blogspot slug
  is the basename of the entry's `link[rel=alternate]` URL (e.g.
  `.../2008/08/jackson-square.html` → `2008-08-17-jackson-square.md`).
  Plain `.md`, not `.mdx` — post bodies contain raw HTML fragments and MDX
  would choke on `<`/`{`.
- **Frontmatter**: `title` (exact original, including the bilingual
  "Deutsch - English" form), `date: YYYY-MM-DD` (from `published`),
  `description` (first sentence of the English half, or German if there is
  no English).
- **Body**: convert the entry's `content.$t` HTML to Markdown by hand for
  these three (Phase 2 automates it). Preserve the DE/EN interleaving and
  paragraph order exactly. Keep harmless inline HTML if Markdown can't
  express it; the goal is fidelity, not purity.
- **Images**: download each `<img src>` to
  `src/assets/blog/<slug>/NN.<ext>` (numbered in order of appearance) with
  `curl`. Reference them with relative paths from the post file so Astro
  optimizes them. If an image is wrapped in an `<a>` to a larger version,
  drop the wrapper and keep the inline size. If a download 404s, note it in
  the post as an italic placeholder (same style as dead videos) and tell the
  user.
- **Cross-links**: rewrite `schlabitz.blogspot.com/YYYY/MM/slug.html` hrefs
  to the local `/blog/...` route of the target post. For the pilot, the
  "Hundebabys" link targets a post that won't exist until Phase 2 — link it
  to its future local slug anyway and record it in a "pending links" note in
  the phase summary to the user.
- **Dead videos**: replace the whole embed block with the italic note from
  the README, keeping any surrounding prose.
- **Comments**: not migrated (README decision 3) — ignore the comment feed
  entirely.

## Step 4: Timeline → blog post links

- In `src/content.config.ts`, extend the `timeline` collection schema with
  an optional field: `post: z.string().optional()` — the slug of a blog
  post (documented in a comment as "slug under src/content/docs/blog/").
  Restart the dev server.
- In `src/pages/bio.astro`, when an event has `post`, render a link after
  the body: `Read the full story →` pointing at `/blog/<slug>/` (verify the
  exact route the plugin generates, including trailing slash, and match it).
  Style it in `src/styles/bio.css` keyed off a `.tl-post-link` class,
  consistent with the existing muted styles (`--sl-color-gray-3`, small
  font). Note: bio page styles are global in bio.css on purpose — do not use
  scoped styles.
- Set `post:` on `src/content/timeline/2008-08-new-orleans-road-trip.md`
  pointing at the Jackson Square pilot post.

(This is Step 3's demo target — do this after the pilots exist.)

## Verification (all through the preview tools; see README gotchas)

1. `npx astro check` and `npm run build` pass.
2. `/blog` lists the three posts, newest first; each post page renders:
   images load locally (network tab shows no `blogspot.com`/
   `googleusercontent.com` requests), umlauts/ß render correctly.
3. The rest of the site renders correctly on the replacement theme;
   spot-check `/` and `/bio` and one docs page in both color schemes (the
   Step 1 regression pass covers this in depth — this is a re-check after
   the plugin went in).
4. On `/bio`, the New Orleans event shows the link; clicking it lands on the
   Jackson Square post.
5. Screenshot each pilot post AND its live Blogspot counterpart is NOT
   required side-by-side, but do open the original in the feed data and
   compare paragraph-by-paragraph for omissions.

## Done when

Screenshots of the three rendered posts and the linked timeline event are
shown to the user with the pending-links note, and the user approves the
format. **Do not start Phase 2 in the same turn as receiving approval unless
the user says so.**

## Known risks

- Surface immediately if the blog plugin's supported Starlight range
  excludes 0.41 — that's a user decision point (pin an older plugin version,
  or hold).
- The ThemeSelect rewrite (Step 1.2) is the most likely thing to break
  subtly: the reading-mode toggle placement AND the no-flash restore script
  in `astro.config.mjs` `head` both assume the current header structure.
  Test reading-mode on/off across a reload.
- The blog posts' `title` frontmatter must be non-empty for the docs schema;
  all three pilots have titles (some other posts don't — that's a Phase 2
  problem, noted there).
