# starlight-theme-chameleon

> **Change the skin, not the skeleton.**

A [Starlight](https://starlight.astro.build) plugin that gives your site switchable **skins** — coordinated colors, typography, and surface feel — chosen from a list you curate. Expose the list to your readers as a picker in the header, or pin a single skin as your site's look.

> **Status:** working, pre-release. Developed in the open inside [legacycoder.net](https://legacycoder.net), which is also the live demo. Not yet published to npm.

## What's a skin?

Starlight routes its entire look through `--sl-`-prefixed CSS custom properties: colors, font families, the type scale, spacing, shadows. A Chameleon skin is that surface, redefined — plus its own scoped CSS for textures, glows, and decorative touches — compiled into the site at build time under a `[data-skin='<name>']` attribute. Switching skins flips one attribute on `<html>`; the choice is remembered across visits and applied before first paint.

What a skin can never do is captured by the motto: it changes presentation, never markup, layout, or components. That single rule is what makes skins safe to switch at runtime, and what keeps Chameleon composable with other Starlight plugins, including `starlight-blog`.

- **Curated list** — you decide which skins your site offers and in what order.
- **Default first** — the picker always offers "Default": your site's own unskinned look. Installing Chameleon changes nothing until a reader picks a skin.
- **You control exposure** — offer readers the picker, or set `picker: false` to pin the first skin site-wide and ship no picker at all.
- **Light and dark aware** — every skin covers Starlight's light/dark/auto mode; readers combine any skin with either mode. The mode switch stays right next to the skin picker.
- **Code blocks follow along** — each skin pairs with matching syntax themes via Expressive Code, compiled into the same build and switched by the same attribute.
- **Fonts on demand** — a skin's webfonts are only downloaded while that skin is active, so offering five skins doesn't ship five typefaces to every reader.
- **Localized** — picker labels ship in English and German, and skin labels can be per-language records.

## Built-in skins

| Name | Feel | Code pairing (dark / light) |
| --- | --- | --- |
| `nordic` | Calm and frosty: [Nord](https://www.nordtheme.com) colors (MIT, Sven Greb), humanist sans, soft shadows | `nord` / `slack-ochin` |
| `crt` | High-contrast retro terminal: green phosphor with glow and scanlines in dark mode, fanfold-paper hardcopy in light mode, mono type throughout | custom monochrome themes |

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
          skins: ['nordic', 'crt'],
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
      label: { en: 'CRT Green', de: 'CRT-Grün' },
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

Custom skins appear in the picker after the built-in ones. Chameleon warns at startup when a custom skin's CSS contains no `[data-skin='<name>']` selector, because unscoped rules leak into every skin. The full property catalog, the light/dark rules, and the starter template live in **[docs/skin-authoring.md](./docs/skin-authoring.md)**.

## Known limits

- **Skins restyle; they never restructure.** Starlight's interface icons are inline SVGs baked in at build time, so skins recolor them but cannot swap their shapes (see [docs/adr](./docs/adr)).
- **Switching needs JavaScript.** Without it, readers get the Default look — the site's own styling — fully usable. That applies to pinned skins too.
- **Every offered skin ships to every reader** (CSS only; fonts stay lazy). Keep the curated list small.

## Why not just install a community theme?

Starlight's community themes are excellent, but each one is a build-time plugin: one theme per site, applied for every reader, often relying on component overrides. Chameleon skins are runtime-switchable precisely because they honor the motto — presentation only, scoped under an attribute, selected by the reader (or pinned by you). Palette-only community themes make great skin *ingredients* (Nordic vendors Nord's colors); structural ones are out of scope. See [docs/adr](./docs/adr) for the reasoning.

## Prior art

As of July 2026 no Starlight plugin offers reader-switchable themes: the ecosystem's own [themes showcase](https://starlight-themes.netlify.app/) previews each community theme as a separately built sub-site, which is the build-time-only model in a nutshell. The closest relatives live outside Starlight. [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/setup/changing-the-colors/) ships a palette toggle that can cycle through named color schemes — colors only, built into the theme rather than pluggable. [daisyUI](https://daisyui.com/docs/themes/) proves the mechanism at scale with 35 themes switched via a `data-theme` attribute, but it's a Tailwind component library, not docs tooling, and has no notion of a curated reader-facing picker.

Chameleon combines pieces that each exist somewhere with a combination that doesn't: full skins (colors, typography, surface feel — not just palettes) for Starlight specifically, curated by the site author, switchable by readers at runtime, and composable with the rest of the plugin ecosystem. And the spiritual ancestor is older than all of it: Winamp skins, which understood that people love making a thing *theirs* without changing what it does.

## License

MIT. The Nord color palette vendored in the `nordic` skin is MIT-licensed, © Sven Greb.
