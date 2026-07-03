# Phase 3 — QA sweep + timeline linking

Read `README.md` in this directory first. Prerequisites: Phases 1–2 done;
the Phase 2 report's "needs a human eye" checklist is your starting backlog,
together with anything the user flagged since.

## Deliverables

1. Phase 2 backlog worked off (or explicitly deferred with user agreement).
2. A QA sweep with evidence that the migrated blog is sound.
3. The blog-derived timeline events linked to their posts.
4. Docs/glossary updated; migration plans marked done.

## Step 1: Work the backlog

Fix the items from the Phase 2 report: retitle the 4 untitled posts (ask
the user for titles — do not invent them silently; suggest candidates from
the post content), reconcile pilot diffs, chase failed image downloads
(retry once; if permanently gone, the italic placeholder stays and the user
is told which posts).

## Step 2: QA sweep

Run these checks and fix what they find; rerun until clean. A small
throwaway Node script in the scratchpad is fine for each; don't over-build.

1. **Build**: `npx astro check` && `npm run build` green.
2. **Encoding**: grep all generated posts for mojibake indicators
   (`Ã¤`, `Ã¶`, `Ã¼`, `ÃŸ`, `â€`, `&amp;nbsp;`, stray `&#`) — bilingual text
   makes encoding bugs both likely and visible.
3. **Images**: every image reference resolves; `dist/` contains no
   `blogspot.com`/`googleusercontent.com` URLs in post HTML
   (`grep -r` over the built output).
4. **Links**: every internal `/blog/...` href in built post HTML corresponds
   to a generated route. List external links (excluding blogspot) without
   checking them — dead 2006 external links are historically authentic; the
   user decides if any get an archive.org treatment. Present the list.
5. **Visual spot-check**: preview 8–10 posts sampled across years and
   categories (image-heavy, video placeholder, untitled-now-retitled,
   tables if any). Screenshot each for the final summary.
   Remember the preview-frames gotcha (README): force frames with
   `preview_screenshot` before judging anything scroll-dependent.
6. **RSS/metadata**: starlight-blog generates an RSS feed if configured —
   check the plugin config produces a working feed at its documented route,
   and that `astro.config.mjs` has a `site` set (the sitemap integration
   currently warns it's missing; fix that while here, asking the user to
   confirm the canonical URL — presumably `https://legacycoder.net`).

## Step 3: Link timeline events to posts

Phase 1 added the optional `post` field and linked the New Orleans event.
Now link the remaining blog-derived events in `src/content/timeline/`:

| Timeline event file | Blog post (by date) |
| --- | --- |
| `2005-04-blog-start.md` | 2005-04-01 "Tag auch - Howdy" |
| `2005-06-rock-point-mission.md` | 2005-06-20 "Rock Point, Tag 1" |
| `2006-06-move-to-illinois.md` | 2006-06-16 "Neue Heimat Illinois" |
| `2006-07-granger-street-house.md` | 2006-07-12 "Unser Harrisburg Haus" |
| `2008-03-flood.md` | 2008-03-21 "Flut 2008 - Flood 2008" |
| `2008-08-new-orleans-road-trip.md` | (done in Phase 1) |
| `2009-05-blog-end.md` | 2009-05-08 "Das ist das Ende" |

Verify each link lands on the right post from the rendered `/bio` page, not
just by eyeballing slugs. Where a series exists (Rock Point days 1–6, the
move has both a departure and an arrival post), the linked post is the one
named above; mention the series alternatives to the user as an option.

## Step 4: Documentation

- `CONTEXT.md`: ensure the Blog post term from Phase 1 still matches
  reality; add terms that crystallised during migration (glossary only — no
  implementation details).
- Consider an ADR only if something met all three ADR criteria (hard to
  reverse, surprising, real trade-off) — e.g. if image storage strategy had
  to change for repo-size reasons. Otherwise skip.
- Add a line to each phase doc in this directory: `> Status: completed
  <date>` (or what was deferred and why).
- The user's memory notes (if you have a memory directory) should get a
  pointer that the blog is migrated and where the migration script lives.

## Done when

The user has seen: the QA results, the spot-check screenshots, the external-
links list, and the linked timeline events — and has signed off. Remind them
the repo is uncommitted if that's still true.
