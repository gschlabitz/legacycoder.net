# starlight-theme-chameleon

> **Change the skin, not the skeleton.**

A [Starlight](https://starlight.astro.build) plugin that gives your site switchable **skins** — coordinated colors, typography, and surface feel — chosen from a list you curate. Expose the list to your readers as a picker in the header, or pin a single skin as your site's look.

> **Status:** working, pre-release. Developed in the open inside [legacycoder.net](https://legacycoder.net), which is also the live demo. Not yet published to npm.

## What's a skin?

Starlight routes its entire look through `--sl-`-prefixed CSS custom properties: colors, font families, the type scale, spacing, shadows. A Chameleon skin is that surface, redefined — plus its own scoped CSS for textures, glows, and decorative touches — compiled into the site at build time under a `[data-skin='<name>']` attribute. Switching skins flips one attribute on `<html>`; the choice is remembered across visits and applied before first paint.

What a skin can never do is captured by the motto: it changes presentation, never markup, layout, or components. That single rule is what makes skins safe to switch at runtime, and what keeps Chameleon composable with other Starlight plugins, including `starlight-blog`.

- **Curated list** — you decide which skins your site offers and in what order.
- **Starlight first** — the picker always offers "Starlight": your site's own unskinned look. Installing Chameleon changes nothing until a reader picks a skin.
- **You control exposure** — offer readers the picker, or set `picker: false` to pin the first skin site-wide and ship no picker at all.
- **Light and dark, always** — every skin covers Starlight's light/dark/auto mode; that requirement is part of the curation. Readers combine any skin with either mode, the mode switch stays right next to the skin picker, and `prefers-color-scheme` keeps working everywhere.
- **Code blocks follow along** — each skin pairs with matching syntax themes via Expressive Code, compiled into the same build and switched by the same attribute.
- **Fonts on demand** — a skin's webfonts are only downloaded while that skin is active, so offering five skins doesn't ship five typefaces to every reader.
- **Nothing to localize** — the picker is a chameleon icon that opens the list of skins by name, and every entry is a proper noun shown identically in every language, including "Starlight" for the unskinned look. The plugin's one UI string (the screen-reader label) ships in ten languages with an English fallback — see [Localization](#localization).

## Built-in skins

| Name | Feel | Code pairing (dark / light) |
| --- | --- | --- |
| `nordic` | Calm and frosty: [Nord](https://www.nordtheme.com) colors (MIT, Sven Greb), humanist sans, soft shadows | `nord` / `slack-ochin` |
| `catppuccin` | Soothing pastels: official [Catppuccin](https://github.com/catppuccin/palette) Mocha and Latte flavors (MIT, Catppuccin Org), mauve accent, rounded surfaces, [Hack](https://github.com/source-foundry/Hack) for code | `catppuccin-mocha` / `catppuccin-latte` |
| `home-computer` | The 80s/90s machine on the family desk: green-phosphor CRT with glow and scanlines in dark mode, fanfold-paper printer hardcopy in light mode, mono type throughout | custom monochrome themes |

## Usage

```js
// astro.config.mjs
import starlight from '@astrojs/starlight'
import starlightThemeChameleon from 'starlight-theme-chameleon'

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Docs',
      plugins: [
        starlightThemeChameleon({
          // Built-in skins to offer, in picker order. Defaults to all of them.
          skins: ['nordic', 'catppuccin', 'home-computer'],
          // Let readers switch (default). Set to false to pin the first skin
          // site-wide and hide the picker.
          picker: true,
        }),
      ],
    }),
  ],
})
```

### Composing with starlight-blog

Chameleon claims exactly one component slot, `ThemeSelect`, for the skin picker. starlight-blog's default `navigation: 'header-end'` wants the same slot — point it at the other side of the header instead:

```js
plugins: [
  starlightBlog({ navigation: 'header-start' }),
  starlightThemeChameleon(),
],
```

If the slot is already taken, Chameleon warns and leaves the existing override alone (no picker, skins unreachable) rather than fighting over it.

### Authoring your own skin

A skin is a CSS file scoped under its `data-skin` attribute, registered alongside the built-in ones:

```js
starlightThemeChameleon({
  skins: ['nordic'],
  customSkins: [
    {
      name: 'crt-green',
      label: 'CRT Green',
      css: './src/styles/skins/crt-green.css',
      // Optional: pair syntax themes (Shiki name or VS Code theme object).
      code: { dark: 'synthwave-84', light: 'vitesse-light' },
    },
  ],
})
```

```css
/* src/styles/skins/crt-green.css */
[data-skin='crt-green'] {
  --sl-color-accent: #33ff33;
  --sl-font: 'VT323', monospace;
  /* ...dark-mode palette... */
}
[data-skin='crt-green'][data-theme='light'] {
  /* ...light-mode palette... */
}
[data-skin='crt-green'] .sl-markdown-content {
  text-shadow: 0 0 2px color-mix(in srgb, currentColor 40%, transparent);
}
```

Custom skins appear in the picker after the built-in ones, and are held to the same bar as built-ins: every skin covers both light and dark mode. Chameleon warns at startup when a custom skin's CSS contains no `[data-skin='<name>']` selector, because unscoped rules leak into every skin. The full property catalog, the light/dark rules, and the starter template live in **[docs/skin-authoring.md](./docs/skin-authoring.md)**.

## Localization

There is nothing you have to translate. Every entry readers see in the picker is a proper noun; the plugin's single localized UI string — the picker's screen-reader label — ships in the ten most common languages (en, zh-CN, es, fr, de, ja, ko, pt, ru, it) and falls back to English elsewhere, never to a raw translation key. To supply it in another language, add the key to your site's [Starlight i18n collection](https://starlight.astro.build/guides/i18n/#translate-starlights-ui):

```json
// src/content/i18n/cs.json
{
  "starlightThemeChameleon.skinSelect.accessibleLabel": "Vybrat skin"
}
```

Contributions of further languages are welcome.

## Known limits

- **Skins restyle; they never restructure.** Starlight's interface icons are inline SVGs baked in at build time, so skins recolor them but cannot swap their shapes (see [docs/adr](./docs/adr)).
- **Switching needs JavaScript.** Without it, readers get the Starlight look — the site's own styling — fully usable. That applies to pinned skins too.
- **Every offered skin ships to every reader** (CSS only; fonts stay lazy). Keep the curated list small.

## Why not just install a community theme?

Starlight's community themes are excellent, but each one is a build-time plugin: one theme per site, applied for every reader, often relying on component overrides. Chameleon skins are runtime-switchable precisely because they honor the motto — presentation only, scoped under an attribute, selected by the reader (or pinned by you). Palette-only community themes make great skin *ingredients* (Nordic vendors Nord's colors); structural ones are out of scope. See [docs/adr](./docs/adr) for the reasoning.

## License

MIT.

Vendored skin ingredients, each MIT-licensed by its upstream:

- **Nord** color palette (`nordic` skin) — © Sven Greb, [nordtheme/nord](https://github.com/nordtheme/nord)
- **Catppuccin** color palette (`catppuccin` skin) — © Catppuccin Org, [catppuccin/palette](https://github.com/catppuccin/palette)
- **Catppuccin for Starlight** variable mapping (`catppuccin` skin) — © Catppuccin Org, [catppuccin/starlight](https://github.com/catppuccin/starlight)
- **Hack** typeface (`catppuccin` skin, vendored webfont) — © Source Foundry Authors, MIT with DejaVu lineage in the public domain, [source-foundry/Hack](https://github.com/source-foundry/Hack) (full text in [fonts/LICENSE-hack.md](./fonts/LICENSE-hack.md))
