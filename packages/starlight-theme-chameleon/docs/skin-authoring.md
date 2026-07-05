# Authoring a skin

A skin is one CSS file, scoped under its `data-skin` attribute, that
redefines Starlight's `--sl-` custom-property surface and may add scoped
presentation rules of its own. The one rule: **change the skin, not the
skeleton** — presentation only, never markup, layout, or components
(ADR 0002). Everything scoped keeps skins safe to switch at runtime with a
single attribute flip.

## Registering

```js
starlightThemeChameleon({
  customSkins: [
    {
      name: 'my-skin', // lowercase letters and dashes
      label: 'My Skin', // a proper noun, never translated (ADR 0004)
      css: './src/styles/skins/my-skin.css',
      // Optional syntax-highlighting pairing (see "Code pairing" below).
      code: { dark: 'dracula', light: 'github-light' },
    },
  ],
})
```

## The three rules

1. **Scope every rule.** Every selector starts with `[data-skin='my-skin']`
   (the attribute lives on `<html>`). Chameleon warns at startup when a
   custom skin's CSS contains no such selector.
2. **Define colors twice.** Starlight treats dark mode as the base and
   overrides light mode at `:root[data-theme='light']` — but those overrides
   live in a cascade layer, and skin CSS (like all Starlight custom CSS) is
   unlayered, so it always wins. Any color your base block sets would
   therefore leak into light mode unless your light block
   (`[data-skin='my-skin'][data-theme='light']`) sets it too. Same for
   shadows and the backdrop overlay.
3. **Mode-independent values go in the base block only.** Fonts, the type
   scale, line heights, and your own presentation rules don't need a light
   counterpart.

## Skeleton of a skin

```css
/* src/styles/skins/my-skin.css */

[data-skin='my-skin'] {
  /* Palette — dark mode (the base). */
  --sl-color-white: …;   /* strongest text */
  --sl-color-gray-1: …;  /* bright text */
  --sl-color-gray-2: …;  /* body text */
  --sl-color-gray-3: …;  /* muted text */
  --sl-color-gray-4: …;  /* faint borders */
  --sl-color-gray-5: …;  /* inline-code bg, hairlines */
  --sl-color-gray-6: …;  /* nav & sidebar bg, code-block bg */
  --sl-color-black: …;   /* page bg */

  --sl-color-accent-low: …;  /* pale accent surfaces */
  --sl-color-accent: …;      /* the accent itself */
  --sl-color-accent-high: …; /* accent-tinted text */

  /* Status trios used by asides & badges: orange (caution), green (tip),
     blue (note), purple, red (danger) — each as -low / main / -high. */
  --sl-color-orange-low: …;
  --sl-color-orange: …;
  --sl-color-orange-high: …;
  /* …green, blue, purple, red… */

  --sl-color-backdrop-overlay: …;
  --sl-shadow-sm: …;
  --sl-shadow-md: …;
  --sl-shadow-lg: …;

  /* Typography — set once, applies to both modes. */
  --sl-font: …, sans-serif;      /* system fallbacks are appended for you */
  --sl-font-mono: …, monospace;
  --sl-line-height: 1.75;
}

[data-skin='my-skin'][data-theme='light'] {
  /* Palette — light mode. Note the inversion: --sl-color-white is the
     STRONGEST TEXT color (dark in light mode) and --sl-color-black is the
     PAGE BACKGROUND (light in light mode). Light mode adds gray-7. */
  --sl-color-white: …;
  /* …gray-1 through gray-6… */
  --sl-color-gray-7: …; /* extra light surface, code-block bg */
  --sl-color-black: …;
  /* …accent trio, status trios, backdrop, shadows… */
}

/* Own presentation rules — still scoped. */
[data-skin='my-skin'] .sl-markdown-content :is(h1, h2, h3, h4, h5) {
  letter-spacing: -0.01em;
}
```

The built-in skins are complete worked examples:
[`skins/nordic.css`](../skins/nordic.css) (palette vendored from a
community color scheme, soft surface feel) and
[`skins/home-computer.css`](../skins/home-computer.css) (heavy surface styling: glow, scanlines,
per-mode effects).

## The skinnable surface

The authoritative catalog is Starlight's own
[`props.css`](https://github.com/withastro/starlight/blob/main/packages/starlight/style/props.css)
— every custom property there is fair game. The high-traffic groups:

| Group | Properties |
| --- | --- |
| Grayscale & surfaces | `--sl-color-white`, `--sl-color-gray-1…7`, `--sl-color-black` |
| Accent | `--sl-color-accent-low`, `--sl-color-accent`, `--sl-color-accent-high` |
| Status trios | `--sl-color-{orange,green,blue,purple,red}{-low,,-high}` |
| Derived colors | `--sl-color-text`, `--sl-color-text-accent`, `--sl-color-text-invert`, `--sl-color-bg`, `--sl-color-bg-nav`, `--sl-color-bg-sidebar`, `--sl-color-bg-inline-code`, `--sl-color-bg-accent`, `--sl-color-hairline*`, `--sl-color-backdrop-overlay` |
| Shadows | `--sl-shadow-sm`, `--sl-shadow-md`, `--sl-shadow-lg` |
| Type | `--sl-font`, `--sl-font-mono`, `--sl-text-2xs…6xl`, `--sl-text-body*`, `--sl-text-code*`, `--sl-text-h1…h5`, `--sl-line-height`, `--sl-line-height-headings` |

The derived colors default to sensible references into your palette
(`--sl-color-bg: var(--sl-color-black)` and so on), so most skins only set
the palette and typography and let the derivations ride.

Layout properties (`--sl-nav-height`, `--sl-sidebar-width`,
`--sl-content-width`, z-indexes) are technically custom properties but they
are the skeleton's geometry — leave them alone.

## Both modes, always

Every Chameleon skin covers light *and* dark mode — that requirement is part
of what makes the list curated (ADR 0005). Readers combine any skin with
either mode, and `prefers-color-scheme` keeps working under every skin, so
there is no single-mode escape hatch. If your concept feels
one-mode-only, design its counterpart anyway: the Home Computer skin's light
mode — the hardcopy that came out of the machine's printer — exists because
of this rule, and the skin is better for it. Chameleon can't check visual mode
coverage mechanically, so this is a bar you hold yourself to; the
"define colors twice" rule above is most of the work.

## Fonts

Skin authors can use system stacks, `@fontsource`, hosted font CSS, or
vendored font files. Chameleon does not forbid any of those: a skin's type is
part of its presentation surface, and site authors who want no non-system
fonts can curate or pin a different skin.

For built-in skins, prefer `@fontsource` when a non-system font is important
to the design. It keeps binaries out of Chameleon's source tree, avoids
runtime requests to third-party font hosts, and lets Astro/Vite emit hashed
font assets with the site build. Import only the weights and subsets the skin
uses, then document the font's upstream and license.

Webfonts lazy-load at runtime: browsers fetch only fonts referenced by active
CSS rules, so a skin's `@font-face` downloads only while that skin is
selected. The package dependency itself is still installed with Chameleon;
the laziness is about browser downloads, not npm installation. Declare
`@font-face` in the skin file (the declaration itself can't be scoped, but an
unused face costs nothing) and reference the family from your scoped
`--sl-font`/`--sl-font-mono`. Starlight appends system fallbacks to those
variables automatically. Worked example: `skins/catppuccin.css` imports only
Inconsolata's Latin 400 and 700 faces from `@fontsource/inconsolata` for its
`--sl-font-mono`.

## Code pairing

Give the skin a `code: { dark, light }` pairing and Chameleon compiles those
syntax themes into the build, activating them via
`[data-skin][data-theme]` selectors. Each side is a
[Shiki bundled theme name](https://shiki.style/themes) or a VS Code theme
object with a unique `name`. Without a pairing, code blocks keep the site's
base syntax themes.

By default Starlight paints code-block chrome (frames, tabs, backgrounds)
with `--sl-` variables, so the chrome follows your skin automatically; pick
token themes that sit well on your `gray-6` (dark) / `gray-7` (light)
surfaces.

## Vendoring community palettes

Palette-only community themes (Nord, Catppuccin, Gruvbox, Flexoki, Rosé
Pine…) make excellent skin ingredients: rescope their color values under
your `[data-skin]` blocks and design typography and surface feel around
them. Keep the license attribution in the CSS header comment — see
`skins/nordic.css` for the pattern. Structural community themes (component
overrides) cannot be turned into skins.
