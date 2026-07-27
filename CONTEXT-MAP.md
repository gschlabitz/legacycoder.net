# Context Map

## Contexts

- [Legacy Coder](./CONTEXT.md) — Guido's personal site (legacycoder.net)
- [Chameleon](./packages/starlight-theme-chameleon/CONTEXT.md) — Starlight plugin for switchable skins (colors, typography, surface feel), developed here as a workspace package
- [Pulsar](./packages/starlight-pulsar/CONTEXT.md) — Starlight plugin for page-scoped background music (Strudel tunes declared per page, overridable by the reader), developed here as a workspace package

## Relationships

- **Legacy Coder → Chameleon**: the site consumes Chameleon as a workspace npm package and serves as its first adopter and live demo. Chameleon knows nothing about the site; anything site-specific (which skins to offer, custom skins, whether readers may switch) enters through its plugin configuration.
- **Legacy Coder → Pulsar**: same shape — the site consumes Pulsar as a workspace package and is its first adopter. Pulsar knows nothing about the site; which tunes exist and which pages carry them enter through plugin configuration and page frontmatter. The site owes Pulsar two things Starlight gives no plugin a hook for: a place in the header to render its control, and a `music` field merged into the docs schema.
- **Chameleon ↔ Pulsar**: independent, and deliberately so. A skin does not carry a tune and a tune does not imply a skin. They contend for nothing at runtime, but both want header space, which Starlight has no way to share (see issue #25).
