# Plan: runtime skin switching

Motto and doctrine: **change the skin, not the skeleton** (ADR 0002). A skin
is any CSS presentation — the `--sl-` custom-property surface plus its own
scoped rules — and never markup, layout, or components.

## Findings (July 2026)

Research that shaped the design — see the ADRs for the decisions themselves.

- **Community themes are build-time plugins.** Each runs in Starlight's
  `config:setup` hook and prepends unscoped CSS to `customCss`, may override
  components, and may reconfigure Expressive Code. One theme per site is the
  assumed model; two installed themes cascade-fight. None of this is
  switchable from a client-side dropdown.
- **Component overrides are single-occupancy.** Starlight allows one override
  per slot per build. Galaxy overrides `Header` + `ThemeSelect`; Rapide
  overrides `ThemeSelect`, `Pagination`, `LanguageSelect`; starlight-blog
  (with its default `navigation: 'header-end'`) overrides `ThemeSelect` to
  place the Blog link. Well-behaved plugins warn and yield on collision.
  Chameleon needs `ThemeSelect`, so the host site must set starlight-blog's
  `navigation: 'header-start'` (Blog link moves to the `SiteTitle` override).
- **Starlight's appearance is custom-property-complete for skin purposes.**
  Colors, font families (`--sl-font`, `--sl-font-mono`), and the whole
  `--sl-text-*` type scale are custom properties (verified in
  `@astrojs/starlight/style/props.css`), so typography and surface feel scope
  under `[data-skin]` exactly like colors. Webfonts lazy-load for free:
  browsers only fetch fonts referenced by active rules, so a skin's typefaces
  download only while it is active.
- **Icons are skeleton.** Starlight inlines interface icons as raw SVG path
  data at build time (`Icon.astro`, `set:html`, `fill="currentColor"`). Skins
  recolor them; swapping shapes would require structural overrides. Icon
  customization is out of scope (ADR 0002).
- **Expressive Code bakes syntax themes at build time**, keyed only to
  Starlight's light/dark `data-theme`. Per-skin code coloring requires
  registering multiple EC themes and mapping `[data-skin]` selectors to them
  via EC's `themeCssSelector` — the highest-risk piece of the plugin.
- **Palette-only community themes are skin ingredients** (Catppuccin, Nord,
  Gruvbox, Flexoki, Rosé Pine): their color variables can be rescoped under
  `[data-skin='<name>']`, with typography and surface feel designed around
  them. Structural themes (Galaxy, Rapide, Obsidian) are out of scope.
- **Starlight's own theme machinery** (ThemeProvider/ThemeSelect) persists
  light/dark in `localStorage` and applies it via an inline head script before
  first paint. The skin attribute follows the same pattern, on a separate key
  and attribute so mode and skin stay orthogonal.

## Phases

### Phase 0 — Skeleton (done)

npm workspace at `packages/starlight-theme-chameleon`, plugin entry with a
no-op `config:setup` that proves package-name specifier resolution
(`starlight-theme-chameleon/styles/base.css`), wired into the site after
`starlightBlog()`. Renamed from palettes to skins before any behavior landed.

### Phase 1 — Expressive Code spike

De-risk the hard part first: get two skins' syntax themes compiled into one
build and switched by a `[data-skin]` selector via `themeCssSelector`, while
plain light/dark keeps working. Outcome decides whether code pairing is
per-skin, or a documented "code blocks keep the base syntax theme" limitation.

### Phase 2 — Skin registry and scoped CSS

Config validation (names, labels, CSS specifiers), a first built-in skin plus
`customSkins` support, skin CSS injected through `customCss`, and a dev-time
warning for skin CSS that fails to scope under `[data-skin]`. Start the skin
authoring kit: a documented catalog of the skinnable `--sl-` surface and a
starter skin template.

### Phase 3 — Skin picker and exposure control

`ThemeSelect` override rendering the picker (skin list + the mode switch),
the `picker` option so site authors choose between reader-selectable skins
and a pinned skin (picker hidden, first skin applied site-wide),
`localStorage` persistence, inline head script against skin flash, i18n
labels (EN/DE first), and the starlight-blog composition: site sets
`navigation: 'header-start'`, picker verified alongside the Blog link.

### Phase 4 — Built-in skins

Design 2–4 coherent skins, each a full statement: colors (vendored
palette-only community themes as ingredients, with license attribution),
typography pairing, surface feel, and the code pairing from the Phase 1
spike. Nordic (Nord-based) and a high-contrast retro skin first — the pair
that best demonstrates the range.

### Phase 5 — Polish and extraction

README rewritten against the real API, demo on legacycoder.net, then extract
`packages/starlight-theme-chameleon` to its own repo with history
(`git filter-repo`), publish to npm, and swap the workspace dependency for a
version range.
