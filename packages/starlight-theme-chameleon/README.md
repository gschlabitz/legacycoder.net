# starlight-theme-chameleon

> **Change the skin, not the skeleton.**

A [Starlight](https://starlight.astro.build) plugin that gives your site switchable **skins** — coordinated colors, typography, and surface feel — chosen from a list you curate. Expose the list to your readers as a picker in the header, or pin a single skin as your site's look.

> **Status:** early development. This package is a skeleton; the feature set below describes where it is headed. It is being built in the open as part of [legacycoder.net](https://legacycoder.net).

## What's a skin?

Starlight routes its entire look through `--sl-`-prefixed CSS custom properties: colors, font families, the type scale, spacing, shadows. A Chameleon skin is that surface, redefined. Skin authors get the whole `--sl-` property set — plus their own scoped CSS for textures, radii, and decorative touches — to make a site look unique and striking.

What a skin can never do is captured by the motto: it changes presentation, never markup, layout, or components. That single rule is what makes skins safe to switch at runtime with one attribute flip, and what keeps Chameleon composable with other Starlight plugins, including `starlight-blog`.

- **Curated list** — you decide which skins your site offers and in what order.
- **You control exposure** — offer readers the picker, or pin one skin and ship no picker at all (Chameleon as a "wear this skin" plugin).
- **Light and dark aware** — every skin covers Starlight's light/dark/auto mode; readers combine any skin with either mode.
- **Instant switching** — all offered skins are compiled into the site at build time; picking one is a single attribute flip, remembered across visits and applied before first paint.
- **Fonts on demand** — a skin's webfonts are only downloaded while that skin is active, so offering five skins doesn't ship five typefaces to every reader.
- **Code blocks follow along** *(planned)* — syntax highlighting pairs with the active skin via Expressive Code, so code samples never look pasted in from another site.

## Usage (planned API)

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
          // Built-in skins to offer, in picker order.
          skins: ['nordic', 'paper', 'crt'],
          // Let readers switch. Set to false to pin the first skin site-wide.
          picker: true,
        }),
      ],
    }),
  ],
})
```

### Authoring your own skin

A skin is a CSS file scoped under its `data-skin` attribute, redefining any of Starlight's `--sl-` properties and adding presentation of its own:

```js
starlightThemeChameleon({
  skins: ['nordic'],
  customSkins: [
    {
      name: 'crt-green',
      label: { en: 'CRT Green', de: 'CRT-Grün' },
      css: './src/styles/skins/crt-green.css',
    },
  ],
})
```

```css
/* src/styles/skins/crt-green.css */
[data-skin='crt-green'] {
  --sl-color-accent: #33ff33;
  --sl-font: 'VT323', monospace;
  --sl-text-base: 1.125rem;
  /* ...dark mode values... */
}
[data-skin='crt-green'][data-theme='light'] {
  /* ...light mode values... */
}
[data-skin='crt-green'] .sl-markdown-content {
  text-shadow: 0 0 2px color-mix(in srgb, currentColor 40%, transparent);
}
```

Custom skins appear in the picker after the built-in ones.

### Known limits

Skins restyle; they never restructure. In practice the one place readers might notice: Starlight's interface icons are inline SVGs baked in at build time, so skins recolor them but cannot swap their shapes. Icon customization is deliberately out of scope (see [docs/adr](./docs/adr)).

## Why not just install a community theme?

Starlight's community themes are excellent, but each one is a build-time plugin: one theme per site, applied for every reader, often relying on component overrides. Chameleon skins are runtime-switchable precisely because they honor the motto — presentation only, scoped under an attribute, selected by the reader (or pinned by you). See [docs/adr](./docs/adr) for the reasoning.

## Prior art

As of July 2026 no Starlight plugin offers reader-switchable themes: the ecosystem's own [themes showcase](https://starlight-themes.netlify.app/) previews each community theme as a separately built sub-site, which is the build-time-only model in a nutshell. The closest relatives live outside Starlight. [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/setup/changing-the-colors/) ships a palette toggle that can cycle through named color schemes — colors only, built into the theme rather than pluggable. [daisyUI](https://daisyui.com/docs/themes/) proves the mechanism at scale with 35 themes switched via a `data-theme` attribute, but it's a Tailwind component library, not docs tooling, and has no notion of a curated reader-facing picker.

Chameleon combines pieces that each exist somewhere with a combination that doesn't: full skins (colors, typography, surface feel — not just palettes) for Starlight specifically, curated by the site author, switchable by readers at runtime, and composable with the rest of the plugin ecosystem. And the spiritual ancestor is older than all of it: Winamp skins, which understood that people love making a thing *theirs* without changing what it does.

## License

MIT
