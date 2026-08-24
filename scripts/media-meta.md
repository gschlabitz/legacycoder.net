# media-meta

Resolve a media URL or title to YAML entries that can be pasted into
`src/data/media.yaml`. Stdout is always YAML; diagnostics stay on stderr.

```bash
npm run media-meta -- "Dune"
```

Plain titles search Open Library (books). Prefix `album:`, `anime:`, or
`manga:` to search those catalogs instead. Pasted Wikipedia, Open Library,
MusicBrainz, MyAnimeList, AniList, YouTube, and Amazon URLs select the
matching resolver.
