# Phase 2 — scripted migration of all 148 posts

Read `README.md` in this directory first. Prerequisite: Phase 1 is done and
the user approved the pilot format. The three pilot posts define the target
format — **your script's output for those three posts must match the
hand-made versions** (that's the built-in acceptance test).

## Deliverables

1. `scripts/migrate-blog.mjs` — a rerunnable Node script that regenerates
   every post from the feed. Committed to the repo (it documents the
   migration).
2. All 148 posts under `src/content/docs/blog/`, images under
   `src/assets/blog/<slug>/`.
3. A migration report for the user (see "Report" below).

## Script requirements

Node ≥ 20, ESM (`.mjs`), run as `node scripts/migrate-blog.mjs`. Keep
dependencies minimal; `turndown` (HTML→Markdown) is pre-approved, ask before
adding others. Structure it as: fetch → transform → write → verify.

### Fetch
- Posts feed with `max-results=500` (README). Assert fetched count ==
  `openSearch$totalResults` == 148; abort loudly if not.
- Cache the feed response to the scratchpad so re-runs don't hammer
  Blogspot; add a `--offline` flag that uses only the cache. If the public
  feed proves insufficient (rate limits, missing content), fall back to a
  Google Takeout Atom export instead (README) — flag that to the user
  rather than working around it silently.

### Transform (per post, following the Phase 1 rules exactly)
- Slug from the `link[rel=alternate]` URL; filename `YYYY-MM-DD-<slug>.md`.
- **Empty titles**: 4 posts have an empty `title.$t` (2008-09-14,
  2008-08-26, 2007-03-29, 2005-04-02). Title them from the blogspot slug
  (e.g. `.../blog-post.html` gives nothing useful → fall back to
  `Untitled (YYYY-MM-DD)`), and list them in the report for the user to
  rename.
- HTML → Markdown with turndown, configured to: keep `<table>`, keep
  unknown tags as raw HTML, not escape German characters. After conversion,
  scan for leftover `&nbsp;`/entity soup and normalize.
- **Images**: for each `<img>`, download `src` to
  `src/assets/blog/<slug>/NN.<ext>` (order of appearance; derive `<ext>`
  from Content-Type, not the URL). Rewrite to a relative reference.
  Blogspot/Picasa URLs contain a size segment (`/s400/`, `/s320/`); download
  the URL exactly as it appears in the body (user decision: no
  original-resolution hunting). Unwrap `<a>`-around-`<img>` wrappers. Record
  every download failure; failed images get the italic placeholder note
  inline.
- **Videos**: any `<embed>`, `<object>`, or iframe pointing at
  video.google.com / googlevideo → replace block with the standard italic
  note (README). Count them for the report.
- **Cross-links**: build a URL→slug map of all 148 posts first, then rewrite
  internal `schlabitz.blogspot.com` links to local `/blog/<slug>/` routes.
  Links to blogspot pages that are NOT one of the 148 posts (archive pages,
  label pages, the blog root) and all external links stay untouched; list
  the untouched blogspot ones in the report.
- **Comments**: not migrated (README decision 3) — ignore the comment feed
  entirely.
- **Description frontmatter**: first sentence of the English half if
  detectable, else first sentence overall, HTML-stripped, ≤ 160 chars.

### Write
- Idempotent: a re-run overwrites `src/content/docs/blog/` and
  `src/assets/blog/` content it generated; it must NOT touch the three
  hand-made pilot files until the final step, where it writes its generated
  versions to the scratchpad and **diffs them against the pilots** —
  differences beyond whitespace are printed and the pilots are left in
  place for a human to reconcile.

### Verify (script-internal, part of the run)
- Every `![](...)` image reference in every generated post resolves to an
  existing file.
- No generated body contains `blogspot.com` or `googleusercontent.com`
  image URLs, and no unrewritten internal post links remain.
- Post count on disk == 148 (pilots included).

## After the script runs

1. Restart the dev server (content collection changed under it; if it
   errors about stale modules: stop server, `rm -rf .astro`, start again).
2. `npx astro check` && `npm run build` — the build optimizing several
   hundred images will be slow the first time; that's expected, don't kill
   it early (set a generous Bash timeout).
3. Spot-check in the preview: the earliest post (2005-04-01), the latest
   (2009-05-08), one German-heavy post, one comment-heavy post, one of the
   four untitled ones. Compare each against its feed HTML for omissions.
4. `/blog` pagination works through all pages.

## Report (final message to the user)

- Counts: posts, images downloaded, image failures, videos replaced,
  cross-links rewritten / left untouched.
- The 4 retitled posts and any pilot-diff discrepancies.
- Anything that needs a human eye, as a checklist for Phase 3.

## Done when

Build is green, spot-checks pass, report delivered. Wait for the user before
Phase 3 (they may want to fix titles first).

## Known risks

- **Repo size**: several hundred images will likely add tens of MB. If the
  total exceeds ~150 MB, stop and ask the user before writing (git hosting
  limits).
- Blogspot rate limiting: throttle image downloads (~4 concurrent, small
  delay); the cache + `--offline` flag exists so a mid-run failure doesn't
  restart from zero.
- Turndown mangling bilingual inline formatting — the pilot-diff step
  exists precisely to catch this; take it seriously.
