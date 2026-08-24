# plant-meta

Resolve a plant name to a paste-ready `plant:` frontmatter block for a
potted-plant page, and fetch its Wikimedia Commons lead image with the TASL
sidecar that `<Figure>` requires. Stdout is always YAML; diagnostics stay
on stderr.

```bash
npm run plant-meta -- "Thymus vulgaris" --slug german-thyme
```

- `--image "File:…"` — pick a specific Commons file over Wikipedia's lead image.
- `--skip-download` — resolve metadata without fetching the image.

Taxonomy comes from GBIF, the summary and lead image from Wikipedia, and
the attribution from the Commons API — all keyless. Images land in
`src/assets/plants/`.

Swapping in your own photo later: replace the image in `src/assets/plants/`
and rewrite its `.json` sidecar; the page markup stays unchanged.

Page structure and the seasonal index: see
[plants authoring](../src/content/docs/plants/_README.md).
