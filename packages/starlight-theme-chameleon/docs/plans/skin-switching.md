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

### Phase 1 — Expressive Code spike (done)

De-risk the hard part first: get two skins' syntax themes compiled into one
build and switched by a `[data-skin]` selector via `themeCssSelector`, while
plain light/dark keeps working. **Outcome: code pairing is per-skin.**
Starlight's EC preprocessor spreads user-level `expressiveCode` options last,
so Chameleon's `themeCssSelector` wins; skin themes ride as extra entries
after the base pair, mapped to `[data-skin='<name>'][data-theme='<mode>']`
(`lib/expressive-code.ts`). Verified in dev and in the production bundle.

### Phase 2 — Skin registry and scoped CSS (done)

Config validation (names, labels, CSS specifiers), built-in skins plus
`customSkins` support (`lib/skins.ts`), skin CSS injected through `customCss`
after the site's own files so an active skin wins ties, and a startup warning
for skin CSS that contains no `[data-skin='<name>']` selector. Authoring kit
in `docs/skin-authoring.md`: skinnable-surface catalog, starter template, the
define-colors-twice rule (skin CSS is unlayered, so it beats Starlight's
layered light-mode remaps).

### Phase 3 — Skin picker and exposure control (done)

`ThemeSelect` override (`components/ThemeSelect.astro`) rendering the skin
picker next to the stock mode select, fed by a virtual module; the picker
always leads with "Starlight" — the host's unskinned look (ADR 0003). `picker:
false` pins the first skin site-wide with no picker. `localStorage` key
`starlight-skin`, inline head script (via Starlight's `head` config) applies
the attribute before first paint, EN/DE labels via `injectTranslations`,
per-language skin labels resolved against `starlightRoute.lang`. Composes
with starlight-blog (`navigation: 'header-start'` frees the slot; collision
warns and yields).

### Phase 4 — Built-in skins (done, 3 of 2–4)

`nordic`: Nord palette (MIT, attributed in the CSS header) on humanist sans,
soft cold shadows; paired with `nord` / `slack-ochin`. `catppuccin`: official
Mocha/Latte palettes with the variable mapping adapted from
catppuccin/starlight (both MIT, attributed), mauve accent, rounded surfaces;
paired with Shiki's bundled `catppuccin-mocha` / `catppuccin-latte`.
`home-computer` (né `crt`): green-phosphor terminal (glow, scanlines,
flicker, mono type, caps headings) whose light mode is a fanfold-paper
hardcopy; paired with custom monochrome VS Code theme objects. Every skin
covers both modes — required (ADR 0005; mode locks were prototyped and
removed). Room left for one more.

### Phase 5 — Polish and extraction (demo done; extraction pending)

README rewritten against the real API; demo live on legacycoder.net
(`skins: ['nordic', 'home-computer']`). Remaining: extract
`packages/starlight-theme-chameleon` to its own repo with history
(`git filter-repo`), publish to npm, and swap the workspace dependency for a
version range.
