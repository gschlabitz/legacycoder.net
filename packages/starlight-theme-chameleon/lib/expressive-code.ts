/**
 * Per-skin syntax highlighting.
 *
 * Expressive Code bakes syntax themes at build time, so every skin's pair is
 * compiled into the one build and mapped to `[data-skin='<name>']` selectors
 * via EC's `themeCssSelector` option. Starlight's EC preprocessor spreads the
 * user-level `expressiveCode` options last, which lets this module override
 * the default light/dark-only selector mapping (verified against
 * `@astrojs/starlight/integrations/expressive-code/preprocessor.ts`).
 *
 * `themeCssSelector` can only ever be a callback — Expressive Code's own type
 * is `((theme, context) => string | false) | false`, with no serializable
 * form. That matters because the options Starlight forwards to the EC
 * integration are serialized into a virtual module with `stableStringify`,
 * which rewrites every function to the string `"[Function]"`. EC's `<Code>`
 * component rejects such options outright, so the callback cannot travel that
 * route. Its one supported channel is a root `ec.config.mjs`, which EC merges
 * over the integration options in *both* the Markdown and `<Code>` paths.
 *
 * So the two halves are kept separate: {@link composeExpressiveCodeConfig}
 * returns the serializable options for Starlight's config alongside the
 * callback, and `index.ts` only forwards the callback when the site has no
 * `ec.config.mjs` to carry it. See `lib/ec-config.ts` for the adopter-facing
 * helper and README's "Expressive Code" section for the whole story.
 */

// Relative imports in this module carry explicit `.ts` extensions: a root
// `ec.config.mjs` reaches it through Node's own `import()` (see
// `lib/ec-config.ts`), and Node's ESM resolver has no extension guessing.
import type { ChameleonSkin, ChameleonCodeTheme } from './skins.ts'

/** Minimal structural view of an Expressive Code theme at CSS-generation time. */
interface EcThemeLike {
  name: string
  type: string
}

interface EcStyleVariantLike {
  theme: EcThemeLike
}

/** EC's `themeCssSelector` callback, as far as Chameleon needs to model it. */
export type ChameleonThemeCssSelector = (
  theme: EcThemeLike,
  context: { styleVariants: EcStyleVariantLike[] }
) => string | false

export interface ComposedExpressiveCodeConfig {
  /**
   * JSON-serializable `expressiveCode` options, safe to hand to Starlight.
   * Deliberately excludes `themeCssSelector`.
   */
  options: Record<string, unknown>
  /**
   * The per-skin selector callback. Serializing it would break EC's `<Code>`
   * component, so it reaches EC either through Starlight's config (sites
   * without an `ec.config.mjs`, which then cannot use `<Code>`) or through
   * `ec.config.mjs` (sites that can).
   */
  themeCssSelector: ChameleonThemeCssSelector
}

function themeName(theme: ChameleonCodeTheme): string {
  return typeof theme === 'string' ? theme : theme.name
}

/** Normalize the site's `expressiveCode.themes` into the base theme list. */
export function toBaseThemes(userThemes: unknown): ChameleonCodeTheme[] {
  // `'starlight-dark'`/`'starlight-light'` are resolved by Starlight's own
  // theme preprocessing.
  if (Array.isArray(userThemes)) return [...userThemes]
  if (userThemes !== undefined) return [userThemes as ChameleonCodeTheme]
  return ['starlight-dark', 'starlight-light']
}

/**
 * Map every skin's paired themes to the `[data-skin][data-theme]` selectors
 * that activate them, collecting the full theme list along the way.
 */
export function resolveSkinThemes(skins: ChameleonSkin[], baseThemes: ChameleonCodeTheme[]) {
  const baseNames = new Set(baseThemes.map(themeName))
  const themes: ChameleonCodeTheme[] = [...baseThemes]
  const addedNames = new Set(baseNames)
  /** Theme name → the `[data-skin][data-theme]` selectors that activate it. */
  const skinSelectors = new Map<string, string[]>()

  for (const skin of skins) {
    if (!skin.code) continue
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

  return { themes, skinSelectors }
}

/** Build the `themeCssSelector` callback for a resolved skin-selector map. */
export function makeThemeCssSelector(skinSelectors: Map<string, string[]>): ChameleonThemeCssSelector {
  return (theme, { styleVariants }) => {
    const selectors = skinSelectors.get(theme.name)
    if (selectors) return selectors.length === 1 ? selectors[0]! : `:is(${selectors.join(', ')})`
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
  }
}

/**
 * Compose the Expressive Code configuration Chameleon needs.
 *
 * Returns `undefined` when there is nothing to do: no skin declares a code
 * pairing, or the site disabled Expressive Code.
 */
export function composeExpressiveCodeConfig(
  skins: ChameleonSkin[],
  starlightEc: unknown
): ComposedExpressiveCodeConfig | undefined {
  if (starlightEc === false) return undefined
  if (!skins.some((skin) => skin.code !== undefined)) return undefined

  const userEc: Record<string, unknown> =
    typeof starlightEc === 'object' && starlightEc !== null ? { ...starlightEc } : {}

  const userThemes = userEc.themes
  const { themes, skinSelectors } = resolveSkinThemes(skins, toBaseThemes(userThemes))

  return {
    options: {
      ...userEc,
      themes,
      // Preserve Starlight's default: EC chrome follows the site's `--sl-`
      // variables (and therefore the active skin) unless the site opted out.
      useStarlightUiThemeColors: userEc.useStarlightUiThemeColors ?? userThemes === undefined,
    },
    themeCssSelector: makeThemeCssSelector(skinSelectors),
  }
}
