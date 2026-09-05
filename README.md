# LegacyCoder.NET

A personal website built with [Astro](https://astro.build/) and
[Starlight](https://starlight.astro.build/).

## Commands

- `astro dev --background` runs dev server at `localhost:4321`
- manage with `astro dev stop`, `astro dev status`, `astro dev logs`
- `npm run build`
- `npm run preview`
- `npm test`

## Deployment

Deploys via [Cloudflare Worker](https://dash.cloudflare.com/?to=/:account/workers/services/view/legacycoder-net)
that serves the static build output ([`wrangler.jsonc`](wrangler.jsonc)). 
Pushing to `main` triggers it.

If Github is down again, use:

  ```bash
  npm run build
  npx wrangler login
  npx wrangler deploy
  ```
