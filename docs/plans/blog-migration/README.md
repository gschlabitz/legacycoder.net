# Blog migration: Schlabitz News → legacycoder.net

Migrate Guido's 2005–2009 family blog (https://schlabitz.blogspot.com/,
148 posts, bilingual German/English) into this site 1:1 using the
`starlight-blog` plugin, and link timeline events to the full posts.

Three phases, one handoff document each. **Execute them in order; stop for
user sign-off at the end of each phase.** Each document is self-contained,
but read this README first in every session.

- [Phase 1](phase-1-plugin-and-pilots.md) — install plugin, migrate 3 pilot
  posts by hand, wire the timeline link field. Establishes the target format.
- [Phase 2](phase-2-bulk-migration.md) — script the migration of all 148
  posts (images, comments, cross-links, dead videos).
- [Phase 3](phase-3-qa-and-linking.md) — verification sweep, fix stragglers,
  link the blog-derived timeline events.

## Non-negotiable decisions (already made with the user — do not relitigate)

1. **1:1 preservation.** Post bodies keep their original wording, both
   languages interleaved exactly as written. No editorial "improvements", no
   splitting into per-language pages via Starlight i18n. Typos in the
   originals stay.
2. **Images are rehosted in this repo** at the resolution Blogspot serves in
   the post body (don't hunt for higher-resolution originals). The point of
   the migration is surviving Google's eventual URL retirement.
3. **Comments are preserved** as a quoted section at the bottom of each post
   (they're friends-and-family history, part of the artifact).
4. **Dead video embeds** (Google Video era, already defunct) are replaced
   with a visible italic note, e.g. *\[Video lost to time — it was hosted on
   Google Video, which shut down in 2012.\]*

## Source data

Everything comes from Blogspot's feeds (public, no auth):

- All posts: `https://schlabitz.blogspot.com/feeds/posts/default?alt=json&max-results=500`
  (verify `openSearch$totalResults` is 148 and matches the fetched count)
- Comments for one post: `https://schlabitz.blogspot.com/feeds/<postId>/comments/default?alt=json`
  where `<postId>` is the numeric tail of the post entry's `id.$t`
  (`tag:blogger.com,1999:blog-<blogId>.post-<postId>`)

Fetch with `curl` into the session scratchpad. Do NOT scrape the website
pages themselves — the feed has cleaner HTML and lazy-loading has already
caused one missed-content incident on this project.

## Repo context you need

- Astro 7 + Starlight 0.41 + `starlight-theme-galaxy`, React islands for
  interactivity only. Read `CLAUDE.md` and `CONTEXT.md` (glossary) first.
- Docs pages live in `src/content/docs/` (the `docs` collection in
  `src/content.config.ts`). **Editing `src/content.config.ts` requires a dev
  server restart**; renaming content files can require `rm -rf .astro` too.
- The timeline (see `CONTEXT.md` for Timeline event / Pin reveal / Focus
  terms) is `src/content/timeline/*.md` + `src/pages/bio.astro` +
  `src/components/TimelineMap.jsx` + `src/styles/bio.css`.
- Preview: `preview_start` with config name `astro` (port 4321). Astro
  allows ONE dev server per project — if a stale one blocks, `npx astro dev
  stop` first. The preview page renders hidden with no animation frames:
  scroll events / IntersectionObserver / rAF do not fire until you force a
  frame with `preview_screenshot`. `window.innerHeight` can read 0 until
  `preview_resize`.
- `npx astro check` and `npm run build` must pass before claiming any phase
  done.
- Do not commit unless the user asks.

## Glossary duties

This project maintains `CONTEXT.md` as a strict glossary. Phase 1 should add
a **Blog post** term (a migrated Schlabitz News entry, preserved 1:1) and a
term for the timeline→post link once its name is settled with the user.
