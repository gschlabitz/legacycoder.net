# Blog authoring

(The underscore prefix keeps this file out of the published site.)

Every post is a timeline event. Published posts require `location`
coordinates in their frontmatter — drafts may omit them until published.
Resolve a place name to a paste-ready block with
[`npm run geocode`](../../../../scripts/geocode.md).

Facts (tags, location, date) are mirrored verbatim to the German
counterpart in `de/blog/`; prose (title, description, excerpt) is
per-locale.

Media references resolve into `src/data/media.yaml` via
[`npm run media-meta`](../../../../scripts/media-meta.md).
