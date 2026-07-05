/**
 * Skin registry: types, built-in skins, and user-config validation.
 *
 * A skin is CSS presentation scoped under `[data-skin='<name>']` — never
 * markup, layout, or components (ADR 0002).
 */

/** A syntax theme: a Shiki bundled theme name or a VS Code theme object. */
export type ChameleonCodeTheme = string | ({ name: string } & Record<string, unknown>)

/** Syntax-highlighting pairing applied while the skin is active. */
export interface ChameleonSkinCode {
  /** Theme used while the skin is shown in dark mode. */
  dark: ChameleonCodeTheme
  /** Theme used while the skin is shown in light mode. */
  light: ChameleonCodeTheme
}

export interface ChameleonSkin {
  /** Identifier used to activate the skin, e.g. `"nordic"`. Lowercase letters and dashes only. */
  name: string
  /**
   * Name shown to readers in the skin picker, e.g. `"Nordic"`.
   * Skin names are proper nouns and are never translated (ADR 0004).
   */
  label: string
  /** Module specifier of the skin's CSS file, e.g. `"./src/styles/skins/my-skin.css"`. */
  css: string
  /**
   * Optional syntax-theme pairing for code blocks.
   * Without it, code blocks keep the site's base syntax themes.
   */
  code?: ChameleonSkinCode
}

export type ChameleonSkinSelector = 'hidden' | 'select' | 'icon'
export type ChameleonThemeSelector = 'select' | 'icon'

export interface StarlightThemeChameleonUserConfig {
  /**
   * Built-in skins to offer, in picker order.
   * Defaults to all built-in skins.
   */
  skins?: string[]
  /**
   * Additional skins supplied by the site author, appended after the built-in ones.
   */
  customSkins?: ChameleonSkin[]
  /**
   * How the Chameleon skin selector is exposed in Starlight's `ThemeSelect`
   * header slot. When `hidden`, the first configured skin is pinned site-wide.
   * @default 'select'
   */
  skinSelector?: ChameleonSkinSelector
  /**
   * How Starlight's light/dark/auto theme selector is rendered in the same slot.
   * @default 'select'
   */
  themeSelector?: ChameleonThemeSelector
}

export interface ResolvedChameleonConfig {
  skins: ChameleonSkin[]
  skinSelector: ChameleonSkinSelector
  themeSelector: ChameleonThemeSelector
}

/* -------------------------------------------------------------------------- */
/* Built-in skins                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Monochrome green-phosphor syntax theme for the Home Computer skin's dark
 * mode. Hierarchy comes from brightness and weight, not hue — like a real
 * terminal.
 */
const homeComputerDarkCode = {
  name: 'chameleon-home-computer-dark',
  type: 'dark',
  colors: {
    'editor.background': '#0a120a',
    'editor.foreground': '#5ce65c',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#2f8f2f', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: '#a3ffa3', fontStyle: 'bold' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#3ecf3e' } },
    { scope: ['constant', 'variable.other.constant', 'support.constant'], settings: { foreground: '#c4ffc4' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#8aff8a' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'entity.name.tag'], settings: { foreground: '#b3f7b3' } },
    { scope: ['variable', 'meta.definition.variable'], settings: { foreground: '#6ef66e' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#49b849' } },
    { scope: ['markup.heading'], settings: { foreground: '#c4ffc4', fontStyle: 'bold' } },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
    { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
  ],
} satisfies ChameleonCodeTheme

/**
 * "Hardcopy" syntax theme for the Home Computer skin's light mode: dark
 * greens and earth tones on fanfold paper.
 */
const homeComputerLightCode = {
  name: 'chameleon-home-computer-light',
  type: 'light',
  colors: {
    'editor.background': '#f5f1e0',
    'editor.foreground': '#27401b',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#77804f', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: '#0a4d0a', fontStyle: 'bold' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#2d6b1e' } },
    { scope: ['constant', 'variable.other.constant', 'support.constant'], settings: { foreground: '#5c4a12' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#145c33' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'entity.name.tag'], settings: { foreground: '#0f3d2e' } },
    { scope: ['variable', 'meta.definition.variable'], settings: { foreground: '#33511f' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#6b7350' } },
    { scope: ['markup.heading'], settings: { foreground: '#1d3312', fontStyle: 'bold' } },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
    { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
  ],
} satisfies ChameleonCodeTheme

export const builtinSkins: ChameleonSkin[] = [
  {
    name: 'nordic',
    label: 'Nordic',
    css: 'starlight-theme-chameleon/skins/nordic.css',
    code: { dark: 'nord', light: 'slack-ochin' },
  },
  {
    name: 'catppuccin',
    label: 'Catppuccin',
    css: 'starlight-theme-chameleon/skins/catppuccin.css',
    code: { dark: 'catppuccin-mocha', light: 'catppuccin-latte' },
  },
  {
    name: 'home-computer',
    label: 'Home Computer',
    css: 'starlight-theme-chameleon/skins/home-computer.css',
    code: { dark: homeComputerDarkCode, light: homeComputerLightCode },
  },
]

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const SKIN_NAME_PATTERN = /^[a-z]+(?:-[a-z]+)*$/

function fail(message: string): never {
  throw new Error(`starlight-theme-chameleon: ${message}`)
}

function validateLabel(label: unknown, name: string): asserts label is ChameleonSkin['label'] {
  if (typeof label !== 'string' || label.trim() === '')
    fail(
      `Skin \`${name}\` has an invalid \`label\` — expected a non-empty string. ` +
        'Skin names are proper nouns and are not translated, so no per-language record is needed.'
    )
}

function validateCodeTheme(theme: unknown, name: string, slot: 'dark' | 'light'): void {
  if (typeof theme === 'string') {
    if (theme.trim() === '') fail(`Skin \`${name}\` has an empty \`code.${slot}\` theme name.`)
    return
  }
  if (typeof theme === 'object' && theme !== null) {
    const themeName = (theme as { name?: unknown }).name
    if (typeof themeName !== 'string' || themeName.trim() === '')
      fail(`Skin \`${name}\` has a \`code.${slot}\` theme object without a \`name\` — Chameleon needs it to map the theme to the skin.`)
    return
  }
  fail(`Skin \`${name}\` has an invalid \`code.${slot}\` — expected a Shiki theme name or a theme object.`)
}

function validateCustomSkin(skin: unknown, index: number): asserts skin is ChameleonSkin {
  if (typeof skin !== 'object' || skin === null)
    fail(`\`customSkins[${index}]\` is not an object.`)
  const { name, label, css, code } = skin as Partial<ChameleonSkin>
  if (typeof name !== 'string' || !SKIN_NAME_PATTERN.test(name))
    fail(
      `\`customSkins[${index}]\` has an invalid \`name\`${typeof name === 'string' ? ` (\`${name}\`)` : ''} — use lowercase letters and dashes only, e.g. \`"my-skin"\`.`
    )
  validateLabel(label, name)
  if (typeof css !== 'string' || css.trim() === '')
    fail(`Skin \`${name}\` needs a \`css\` module specifier, e.g. \`"./src/styles/skins/${name}.css"\`.`)
  if (code !== undefined) {
    if (typeof code !== 'object' || code === null)
      fail(`Skin \`${name}\` has an invalid \`code\` — expected \`{ dark, light }\`.`)
    const { dark, light } = code as Partial<ChameleonSkinCode>
    // Every skin covers both modes (ADR 0005), so a pairing needs both faces.
    if (dark === undefined || light === undefined)
      fail(`Skin \`${name}\` has an incomplete \`code\` pairing — every skin covers both modes, so it needs both \`dark\` and \`light\` themes.`)
    validateCodeTheme(dark, name, 'dark')
    validateCodeTheme(light, name, 'light')
  }
}

/** Validate the user config and resolve it into the ordered list of skins to build. */
export function resolveConfig(userConfig: StarlightThemeChameleonUserConfig): ResolvedChameleonConfig {
  if (typeof userConfig !== 'object' || userConfig === null)
    fail('Plugin options must be an object.')

  const {
    skins: requestedNames,
    customSkins = [],
    skinSelector = 'select',
    themeSelector = 'select',
  } = userConfig

  if (skinSelector !== 'hidden' && skinSelector !== 'select' && skinSelector !== 'icon')
    fail('The `skinSelector` option must be one of: `hidden`, `select`, or `icon`.')
  if (themeSelector !== 'select' && themeSelector !== 'icon')
    fail('The `themeSelector` option must be one of: `select` or `icon`.')

  const builtinNames = builtinSkins.map((skin) => skin.name)
  let requested: ChameleonSkin[]
  if (requestedNames === undefined) {
    requested = [...builtinSkins]
  } else {
    if (!Array.isArray(requestedNames)) fail('The `skins` option must be an array of built-in skin names.')
    requested = requestedNames.map((name) => {
      const skin = builtinSkins.find((s) => s.name === name)
      if (!skin)
        fail(`Unknown built-in skin \`${String(name)}\`. Available built-in skins: ${builtinNames.join(', ')}.`)
      return skin
    })
  }

  if (!Array.isArray(customSkins)) fail('The `customSkins` option must be an array.')
  customSkins.forEach((skin, index) => validateCustomSkin(skin, index))

  const skins = [...requested, ...customSkins]
  if (skins.length === 0)
    fail('No skins configured. Offer at least one built-in skin via `skins` or provide `customSkins`.')

  const seen = new Set<string>()
  for (const skin of skins) {
    if (seen.has(skin.name)) fail(`Duplicate skin name \`${skin.name}\`.`)
    seen.add(skin.name)
  }
  for (const skin of customSkins) {
    if (builtinNames.includes(skin.name) && !requested.some((s) => s.name === skin.name))
      fail(`Custom skin \`${skin.name}\` shadows a built-in skin name. Pick a different name.`)
  }

  return { skins, skinSelector, themeSelector }
}
