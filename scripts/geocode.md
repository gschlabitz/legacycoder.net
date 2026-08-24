# geocode

Resolve a free-form place or address string to the structured `location`
frontmatter block the content schema requires (see `src/content.config.ts`),
printed paste-ready.

```bash
npm run geocode -- "213 North Granger Street, Harrisburg, Illinois"
```

Uses Nominatim, OpenStreetMap's public geocoder — keyless. Several
candidates print as raw JSON on purpose: place names are ambiguous
(Harrisburg, PA dwarfs Harrisburg, IL). Each result's `type` field states
match precision — `house` is an exact address point, street types mean a
point along the road, `administrative` fell back to the whole town.

US matches get `state` and no `country`; matches abroad get `country` and
no `state` (the display label derives as "city, state ?? country").
Coordinates round to 4 decimals (~11 m).

Where the block goes: see [blog authoring](../src/content/docs/blog/_README.md).
