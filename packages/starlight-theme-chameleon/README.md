# starlight-theme-chameleon

> **Change the skin, not the skeleton.**

A [Starlight](https://starlight.astro.build) plugin that gives your site switchable **skins** — coordinated colors, typography, and surface feel — chosen from a list you curate. Expose the list to your readers as a selector in the header, or pin a single skin as your site's look.

> **Status:** working, pre-release. Developed in the open inside [legacycoder.net](https://legacycoder.net), which is also the live demo. Not yet published to npm.

## What's a skin?

Starlight routes its entire look through `--sl-`-prefixed CSS custom properties: colors, font families, the type scale, spacing, shadows. A Chameleon skin is that surface, redefined — plus its own scoped CSS for textures, glows, and decorative touches — compiled into the site at build time under a `[data-skin='<name>']` attribute. Switching skins flips one attribute on `<html>`; the choice is remembered across visits and applied before first paint.

What a skin can never do is captured by the motto: it changes presentation, never markup, layout, or components. That single rule is what makes skins safe to switch at runtime, and what keeps Chameleon composable with other Starlight plugins, including `starlight-blog`.

- **Curated list** — you decide which skins your site offers and in what order.
- **Starlight first** — the skin selector always offers "Starlight": your site's own unskinned look. Installing Chameleon changes nothing until a reader picks a skin.
- **You control exposure** — render the skin selector as a visible select, a compact icon button, or hide it to pin the first skin site-wide.
- **Light and dark, always** — every skin covers Starlight's light/dark/auto mode; that requirement is part of the curation. Readers combine any skin with either mode, the mode switch stays right next to the skin selector, and `prefers-color-scheme` keeps working everywhere.
- **Code blocks follow along** — each skin pairs with matching syntax themes via Expressive Code, compiled into the same build and switched by the same attribute.
- **Fonts on demand** — skin webfonts are only downloaded while their skin is active; built-in skins use `@fontsource` for non-system fonts so they avoid runtime third-party font requests without vendoring binaries.
- **Nothing to localize** — every skin entry is a proper noun shown identically in every language, including "Starlight" for the unskinned look. The plugin's one UI string (the selector label) ships in ten languages with an English fallback — see [Localization](#localization).

## Built-in skins

| Name | Feel | Code pairing (dark / light) |
| --- | --- | --- |
| `nordic` | Calm and frosty: [Nord](https://www.nordtheme.com) colors (MIT, Sven Greb), humanist sans, soft shadows | `nord` / `slack-ochin` |
| `catppuccin` | Soothing pastels: official [Catppuccin](https://github.com/catppuccin/palette) Mocha and Latte flavors (MIT, Catppuccin Org), mauve accent, rounded surfaces, [Inconsolata](https://github.com/cyrealtype/Inconsolata) for code | `catppuccin-mocha` / `catppuccin-latte` |
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
          // How Chameleon's skin selector renders in Starlight's ThemeSelect slot.
          // Defaults to 'select'. Use 'hidden' to pin the first skin site-wide.
          skinSelector: 'select', // 'hidden' | 'select' | 'icon'
          // How Starlight's light/dark/auto theme selector renders in the same slot.
          // Defaults to 'select', which preserves Starlight's stock selector.
          themeSelector: 'select', // 'select' | 'icon'
          // Whether a root `ec.config.mjs` carries the per-skin syntax themes,
          // which Expressive Code's `<Code>` component requires. Auto-detected
          // when unset. See "Using Expressive Code's <Code> component" below.
          ecConfigFile: undefined, // true | false
        }),
      ],
    }),
  ],
})
```

### Selector appearance

Both `skinSelector` variants open the same popup — a list of skins, each row previewing the look in that skin's own palette, with arrow-key navigation and the current choice marked. They differ only in the trigger:

| `skinSelector` | Trigger |
| --- | --- |
| `'select'` (default) | A Starlight-like select control showing the active skin's name and a caret. Widest, and the only variant with visible state at rest. |
| `'icon'` | A square button holding a palette glyph. Compact enough to sit among the header's other icon actions; the active skin is visible only in the page itself and in the popup. |
| `'hidden'` | No control. The first entry in `skins` is pinned site-wide. |

`themeSelector: 'icon'` likewise replaces Starlight's light/dark/auto `<select>` with a single square button that cycles the three modes — sun for light, moon for dark, and a half-filled contrast circle for auto. Use it when the skin selector is also an icon, so the two controls match. `themeSelector: 'select'` (the default) leaves Starlight's own selector exactly as it ships.

### Using Expressive Code's `<Code>` component

If your site imports `<Code>` from `@astrojs/starlight/components`, add an `ec.config.mjs` next to your Astro config:

```js
// ec.config.mjs
import { chameleonExpressiveCode } from 'starlight-theme-chameleon/ec-config'

export default chameleonExpressiveCode()
```

That is the whole change. No skin list is needed — Chameleon defaults to every built-in skin, and selectors for skins your site doesn't register are never consulted, so this file can't drift out of step with `astro.config.mjs`. If your site sets its own `expressiveCode.themes`, or supplies `customSkins`, pass them here too:

```js
export default chameleonExpressiveCode({
  customSkins: [/* the same objects you pass to the plugin */],
  themes: [/* the same themes you pass to Starlight's expressiveCode */],
})
```

Already have an `ec.config.mjs`? Spread the result into it:

```js
export default { ...chameleonExpressiveCode(), styleOverrides: { borderRadius: '0.5rem' } }
```

**Why this is necessary.** Chameleon pairs each skin with its own syntax themes through Expressive Code's `themeCssSelector` option, which EC accepts only as a callback — its type is `((theme, context) => string | false) | false`, with no serializable form. The options Starlight forwards to the EC integration are serialized into a virtual module, so a callback sent that way arrives as the string `"[Function]"`, and `<Code>` refuses to render. A root `ec.config.mjs` is EC's supported channel for exactly this, and EC merges it over the integration options in both the Markdown and `<Code>` paths, so Chameleon hands the callback over and stops forwarding it itself.

Without the file, `<Code>` throws *while rendering* — after the response headers are sent, so the page is silently truncated at that point, with no error in the browser and only the dev-server log naming the cause. Markdown and MDX code fences are unaffected either way, as is everything else Chameleon does; only the `<Code>` component needs this.

> **The full story — and a to-do.** [docs/expressive-code.md](./docs/expressive-code.md) records the whole root-cause chain, the alternatives that don't work and why, and the verification evidence.
>
> **TODO (Guido) — [#32](https://github.com/gschlabitz/legacycoder.net/issues/32):** examine this fix in depth before relying on it long-term. It works and is verified, but it leans on two *undocumented* upstream implementation details — EC merging the config file over the integration options, and Starlight's EC preprocessor spreading user options last (`...rest`). Neither is a public guarantee, there is no test asserting the composed selector reaches the rendered CSS, and the whole mechanism should be deleted rather than maintained if EC ever accepts a serializable selector form. See "Open questions" in that document.

### Controlling the handover: `ecConfigFile`

Chameleon auto-detects the file by default. Because it cannot see what EC merged, it can't tell a file that carries its options from one that exists for unrelated reasons — so the behavior is adjustable:

| `ecConfigFile` | Behavior |
| --- | --- |
| unset (default) | Auto-detect. Defers to the file when present; warns that `<Code>` is unusable when absent. |
| `true` | The file supplies the callback. **Fails the build** if it's missing, instead of silently dropping per-skin syntax themes. |
| `false` | Chameleon supplies the callback itself and stays quiet. Use this when your site never imports `<Code>`. |

Every state that falls short reports itself at startup, since each failure is otherwise invisible: a missing file warns (or errors under `ecConfigFile: true`), and a file that never mentions `chameleonExpressiveCode` warns that code blocks will keep your base syntax themes instead of following the skin.

If you would rather not add the file at all, set `ecConfigFile: false` and import Astro's own `<Code>` from `astro:components`. It renders through Shiki rather than Expressive Code, so it follows light/dark but not the active skin.

### Composing with starlight-blog

Chameleon claims exactly one component slot, `ThemeSelect`, for its selector controls. starlight-blog's default `navigation: 'header-end'` wants the same slot — point it at the other side of the header instead:

```js
plugins: [
  starlightBlog({ navigation: 'header-start' }),
  starlightThemeChameleon(),
],
```

If the slot is already taken, Chameleon warns and leaves the existing override alone rather than fighting over it. Set `skinSelector: 'hidden'` and `themeSelector: 'select'` if you only want a pinned skin and do not need Chameleon to render selector controls.

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

Custom skins appear in the selector after the built-in ones, and are held to the same bar as built-ins: every skin covers both light and dark mode. Chameleon warns at startup when a custom skin's CSS contains no `[data-skin='<name>']` selector, because unscoped rules leak into every skin. The full property catalog, the light/dark rules, and the starter template live in **[docs/skin-authoring.md](./docs/skin-authoring.md)**.

Skin authors are free to choose the font loading strategy that fits their site: system stacks, `@fontsource`, hosted font CSS, or vendored font files. Chameleon's built-in skins prefer `@fontsource` for non-system fonts because it keeps font files out of this source tree and avoids browser requests to third-party font hosts. When using font packages, import only the weights and subsets the skin actually needs and document the license.

## Localization

There is nothing you have to translate. Every entry readers see in the selector is a proper noun; the plugin's single localized UI string — the skin selector label — ships in the ten most common languages (en, zh-CN, es, fr, de, ja, ko, pt, ru, it) and falls back to English elsewhere, never to a raw translation key. To supply it in another language, add the key to your site's [Starlight i18n collection](https://starlight.astro.build/guides/i18n/#translate-starlights-ui):

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
- **Per-skin syntax themes need a one-line `ec.config.mjs`** before Expressive Code's `<Code>` component can be used. EC's `themeCssSelector` option is callback-only, and the options Starlight forwards to the EC integration are serialized — see [Using Expressive Code's `<Code>` component](#using-expressive-codes-code-component) and [docs/expressive-code.md](./docs/expressive-code.md). Code fences never need it.
- **Every offered skin's CSS ships to every reader.** Font package dependencies are installed with Chameleon, but browsers only download a font file when the active skin references that face. Keep the curated list small.

## Why not just install a community theme?

Starlight's community themes are excellent, but each one is a build-time plugin: one theme per site, applied for every reader, often relying on component overrides. Chameleon skins are runtime-switchable precisely because they honor the motto — presentation only, scoped under an attribute, selected by the reader (or pinned by you). Palette-only community themes make great skin *ingredients* (Nordic vendors Nord's colors); structural ones are out of scope. See [docs/adr](./docs/adr) for the reasoning.

## License

MIT.

Skin ingredients and font dependencies:

- **Nord** color palette (`nordic` skin) — © Sven Greb, [nordtheme/nord](https://github.com/nordtheme/nord)
- **Catppuccin** color palette (`catppuccin` skin) — © Catppuccin Org, [catppuccin/palette](https://github.com/catppuccin/palette)
- **Catppuccin for Starlight** variable mapping (`catppuccin` skin) — © Catppuccin Org, [catppuccin/starlight](https://github.com/catppuccin/starlight)
- **Inconsolata** typeface (`catppuccin` skin, loaded via `@fontsource/inconsolata`) — © The Inconsolata Project Authors, OFL-1.1, [cyrealtype/Inconsolata](https://github.com/cyrealtype/Inconsolata)
