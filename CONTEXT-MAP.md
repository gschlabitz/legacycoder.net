# Context Map

## Contexts

- [Legacy Coder](./CONTEXT.md) — Guido's personal site (legacycoder.net)
- [Chameleon](./packages/starlight-theme-chameleon/CONTEXT.md) — Starlight plugin for switchable skins (colors, typography, surface feel), developed here as a workspace package
- [Pulsar](./packages/starlight-pulsar/CONTEXT.md) — page-scoped Strudel tunes

## Relationships

- **Legacy Coder → Chameleon**: the site consumes Chameleon as a workspace npm package and serves as its first adopter and live demo. Chameleon knows nothing about the site; anything site-specific (which skins to offer, custom skins, whether readers may switch) enters through its plugin configuration.
- **Legacy Coder → Pulsar**: the plugin configuration defines the site-wide tune catalog; participating pages select from it and render their own player.
- **Chameleon ↔ Pulsar**: independent; skins and tunes do not imply each other.
