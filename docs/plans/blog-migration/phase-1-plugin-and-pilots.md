# Phase 1 — starlight-blog plugin + 3 pilot posts + timeline link field

Read `README.md` in this directory first. Goal: prove the whole stack on
three hand-migrated posts and get user sign-off on the format before
anything is bulk-generated.

## Deliverables

1. `starlight-blog` installed, configured, rendering at `/blog` without
   breaking the Galaxy theme or the existing pages (`/`, `/bio`, `/pfeffer`,
   `/links`, `/recipes`, `/llm-notebook/*`).
2. Three pilot posts migrated by hand (listed below), pixel-faithful to the
   originals: images rehosted, comments preserved, cross-link and dead-video
   treatments demonstrated.
3. Timeline events support an optional link to a blog post, demonstrated on
   one event.
4. User has seen screenshots of all three posts and approved the format.

## Step 1: Install and configure the plugin

```sh
npm install starlight-blog
```

- Docs: https://github.com/HiDeoo/starlight-blog — check the README for the
  version compatible with Starlight 0.41 and for plugin-ordering guidance
  relative to theme plugins (`starlightThemeGalaxy` is already in
  `astro.config.mjs`). If ordering is undocumented, put `starlightBlog()`
  first and verify visually that both blog pages and the theme still look
  right.
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

## Step 2: Migrate the three pilot posts by hand

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
- **Comments**: fetch the post's comment feed (README). If it has comments,
  append:

  ```markdown
  ---

  ## Kommentare - Comments

  > **<author>** (<YYYY-MM-DD>): <comment text>
  ```

  One blockquote per comment, original language untouched.

## Step 3: Timeline → blog post links

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

## Verification (all through the preview tools; see README gotchas)

1. `npx astro check` and `npm run build` pass.
2. `/blog` lists the three posts, newest first; each post page renders:
   images load locally (network tab shows no `blogspot.com`/
   `googleusercontent.com` requests), umlauts/ß render correctly, comments
   section present where the source has comments.
3. The Galaxy theme still styles the rest of the site; spot-check `/` and
   `/bio` and one docs page.
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

- Plugin/theme incompatibility (version mismatch with Starlight 0.41 or CSS
  collisions with Galaxy). Surface immediately if the plugin's supported
  Starlight range excludes 0.41 — that's a user decision point (pin an older
  plugin, or hold).
- The blog posts' `title` frontmatter must be non-empty for the docs schema;
  all three pilots have titles (some other posts don't — that's a Phase 2
  problem, noted there).
