# LegacyCoder.NET

A Personal Website using [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/). 

- `npm run dev` - local dev server at `localhost:4321`
- `npm run build` - build site to `./dist/`
- `npm run preview` - preview build locally
- `npm run astro -- --help` - Astro CLI help

## Site Conventions

Every timeline event (`src/content/timeline/`) needs a `location`.
Resolve arbitrary addresses via [Nominatim](http://nominatim.org/):

```
npm run geocode -- "123 Main Street, Harrisburg, Illinois"
```
