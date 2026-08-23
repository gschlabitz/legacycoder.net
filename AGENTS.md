## Development

Before starting the dev server, check if it is maybe already running. If not, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Authoring

Every blog post is a timeline event (ADR-0004). Published posts require
`location` coordinates in their frontmatter — drafts may omit them until
published. Facts (tags, location, date) are mirrored to the German
counterpart file; prose (title, description, excerpt) is per-locale. Resolve
a place name to a paste-ready block with:

```
npm run geocode -- "Harrisburg, Illinois"
```

Resolve a media URL or title to entries that can be pasted into
`src/data/media.yaml` with:

```
npm run media-meta -- "Dune"
```

Plain titles search Open Library. Use `album:`, `anime:`, or `manga:` before
titles for those catalogs; pasted Wikipedia, Open Library, MusicBrainz,
MyAnimeList, AniList, YouTube, and Amazon URLs select the matching resolver.

Potted-plant pages live in `src/content/docs/plants/` with a structured
`plant:` frontmatter block (botanical facts plus a machine-readable care
schedule — see `src/content.config.ts`). Resolve a plant name to a
paste-ready block, and fetch its Commons image with the TASL sidecar that
`<Figure>` needs, with:

```
npm run plant-meta -- "Thymus vulgaris" --slug german-thyme
```

Pass `--image "File:…"` to pick a specific Commons file over Wikipedia's
lead image. Swapping in your own photo later means replacing the image in
`src/assets/plants/` and rewriting its `.json` sidecar; the page markup
stays unchanged.

The plants index is a hand-curated seasonal guide written as static
Markdown. `plant.schedule: true` means the plant belongs to the current
collection; when adding or removing one, update the watering groups and
relevant month notes in `src/content/docs/plants/index.mdx` and
`src/content/docs/de/plants/index.mdx`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
