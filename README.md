# LegacyCoder.NET

A personal website built with [Astro](https://astro.build/) and
[Starlight](https://starlight.astro.build/).

## Commands

- `astro dev --background` — dev server at `localhost:4321`; manage with
  `astro dev stop`, `astro dev status`, `astro dev logs`
- `npm run build` — build the site to `./dist/`
- `npm run preview` — preview the build locally
- `npm test` — run the script tests

## Where the docs live

Documentation is colocated with its subject:

- [`scripts/geocode.md`](scripts/geocode.md),
  [`scripts/media-meta.md`](scripts/media-meta.md),
  [`scripts/plant-meta.md`](scripts/plant-meta.md) — the authoring scripts,
  each next to its `.mjs` (script headers carry the implementation notes)
- [`scripts/morph/README.md`](scripts/morph/README.md) — running coding
  agents on Morph Cloud task instances
- `src/content/docs/<collection>/_README.md` — authoring rules per content
  collection ([blog](src/content/docs/blog/_README.md),
  [plants](src/content/docs/plants/_README.md),
  [workarounds](src/content/docs/workarounds/_README.md)); the underscore
  prefix keeps them out of the published site
- [`AGENTS.md`](AGENTS.md) — agent behavior rules only, nothing else

## Astro references

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
- [Internationalization](https://docs.astro.build/en/guides/internationalization/)
