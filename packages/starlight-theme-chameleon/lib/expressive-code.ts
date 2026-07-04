/**
 * Per-skin syntax highlighting.
 *
 * Expressive Code bakes syntax themes at build time, so every skin's pair is
 * compiled into the one build and mapped to `[data-skin='<name>']` selectors
 * via EC's `themeCssSelector` option. Starlight's EC preprocessor spreads the
 * user-level `expressiveCode` options last, which lets this module override
 * the default light/dark-only selector mapping (verified against
 * `@astrojs/starlight/integrations/expressive-code/preprocessor.ts`).
 */

import type { ChameleonSkin, ChameleonCodeTheme } from './skins'

/** Minimal structural view of an Expressive Code theme at CSS-generation time. */
interface EcThemeLike {
  name: string
  type: string
}

interface EcStyleVariantLike {
  theme: EcThemeLike
}

function themeName(theme: ChameleonCodeTheme): string {
  return typeof theme === 'string' ? theme : theme.name
}

/**
 * Compose the `expressiveCode` options Chameleon passes to Starlight.
 *
 * Returns `undefined` when there is nothing to do: no skin declares a code
 * pairing, or the site disabled Expressive Code.
 */
export function composeExpressiveCodeConfig(
  skins: ChameleonSkin[],
  starlightEc: unknown
): Record<string, unknown> | undefined {
  const paired = skins.filter(
    (skin): skin is ChameleonSkin & { code: NonNullable<ChameleonSkin['code']> } => skin.code !== undefined
  )
  if (paired.length === 0 || starlightEc === false) return undefined

  const userEc: Record<string, unknown> =
    typeof starlightEc === 'object' && starlightEc !== null ? { ...starlightEc } : {}

  // Base themes stay in charge of the unskinned site (and of skins without a
  // code pairing). `'starlight-dark'`/`'starlight-light'` are resolved by
  // Starlight's own theme preprocessing.
  const userThemes = userEc.themes
  const baseThemes: ChameleonCodeTheme[] = Array.isArray(userThemes)
    ? [...userThemes]
    : userThemes !== undefined
      ? [userThemes as ChameleonCodeTheme]
      : ['starlight-dark', 'starlight-light']
  const baseNames = new Set(baseThemes.map(themeName))

  const themes: ChameleonCodeTheme[] = [...baseThemes]
  const addedNames = new Set(baseNames)
  /** Theme name → the `[data-skin][data-theme]` selectors that activate it. */
  const skinSelectors = new Map<string, string[]>()

  for (const skin of paired) {
    for (const mode of ['dark', 'light'] as const) {
      const entry = skin.code[mode]
      const name = themeName(entry)
      // A skin pairing a base theme needs no extra selector: the base
      // `[data-theme]` rules already apply for every value of `data-skin`.
      if (baseNames.has(name)) continue
      if (!addedNames.has(name)) {
        themes.push(entry)
        addedNames.add(name)
      }
      const selectors = skinSelectors.get(name) ?? []
      selectors.push(`[data-skin='${skin.name}'][data-theme='${mode}']`)
      skinSelectors.set(name, selectors)
    }
  }

  return {
    ...userEc,
    themes,
    // Preserve Starlight's default: EC chrome follows the site's `--sl-`
    // variables (and therefore the active skin) unless the site opted out.
    useStarlightUiThemeColors: userEc.useStarlightUiThemeColors ?? userThemes === undefined,
    themeCssSelector: (theme: EcThemeLike, { styleVariants }: { styleVariants: EcStyleVariantLike[] }) => {
      const selectors = skinSelectors.get(theme.name)
      if (selectors) return selectors.length === 1 ? selectors[0] : `:is(${selectors.join(', ')})`
      // Base themes keep Starlight's light/dark switch semantics: the first
      // theme and the first non-skin theme of the opposite type map to
      // `[data-theme='dark'|'light']`; any extras stay name-addressed.
      const base = styleVariants[0]?.theme
      const alt = styleVariants.find(
        (variant) =>
          variant.theme !== base && !skinSelectors.has(variant.theme.name) && variant.theme.type !== base?.type
      )?.theme
      if (theme === base || theme === alt) return `[data-theme='${theme.type}']`
      return `[data-theme='${theme.name}']`
    },
  }
}
