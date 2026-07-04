# LegacyCoder.NET - A Personal Website


Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.
Images that should be kept out of the Astro build pipeline go into the `/public` folder, e.g. favicons, social-card images, already optimized images, downloadable files, e.g. PDFs.


- `npm run dev` - local dev server at `localhost:4321`
- `npm run build` - Build your production site to `./dist/`
- `npm run preview` - Preview your build locally, before deploying
- `npm run astro -- --help` - Get help using the Astro CLI

## Geocoding timeline events

Every bio timeline event (`src/content/timeline/`) needs a `location` with
coordinates. Resolve a place name or street address to a paste-ready
frontmatter block with:

```
npm run geocode -- "213 North Granger Street, Harrisburg, Illinois"
```

It queries Nominatim (OpenStreetMap's public geocoder — no API key) and
prints the matching candidates as raw JSON, followed by the `location:`
block for the top match. Check the candidates before pasting: place names
are ambiguous, and each result's `type` field tells you the precision of
the match (`house` = exact address point, street types = somewhere along
the road, `administrative` = the whole town).
