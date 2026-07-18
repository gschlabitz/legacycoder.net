# Blog posts are the timeline's source; the timeline collection is gone

The bio timeline no longer has its own content collection — every blog post
is a timeline event, and the timeline is a lens on the archive. The 23
`src/content/timeline/` events were migrated one-time into
`src/content/docs/blog/` (standalone events became posts; events that
pointed at an existing post merged into it, their summary becoming the
post's `excerpt`) and the collection was deleted. The alternatives were a
membership flag or keeping two collections joined by a `post` field; both
were rejected because a blog *is* a set of dated stories — a 1:1 fit —
and a second source of dated content invariably drifts from the first
(the `post` links, duplicate dates, and parallel tag vocabularies were
already drifting).

Consequences worth knowing:

- The blog stopped being "the migrated Schlabitz News" and became the full
  archive and retroactive auto-biography (birth, 1972, to present). The
  Schlabitz News era is one stretch of it.
- Timeline needs (`location`, the closed tag vocabulary) can't be
  schema-enforced anymore — blog posts share the docs collection's schema
  with ordinary docs pages, so every extension field is optional in zod and
  a build-time check in the timeline loader enforces the real rules
  (published posts need coordinates; drafts are exempt until published).
- Sphere is derived, not stored: `career` tag → work, everything else →
  life. Do not add a `sphere` field back.
- starlight-blog is consumed strictly as-is (see ADR-0003); everything the
  timeline adds lives in this repo's schema extension and page code.
