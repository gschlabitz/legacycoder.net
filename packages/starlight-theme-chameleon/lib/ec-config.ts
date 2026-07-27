/**
 * Adopter-facing entry point for a root `ec.config.mjs`.
 *
 * Chameleon maps each skin's syntax themes to `[data-skin][data-theme]`
 * selectors through Expressive Code's `themeCssSelector` option, which EC only
 * accepts as a callback. Options that Starlight forwards to the EC integration
 * are serialized into a virtual module, so a callback sent that way arrives as
 * the string `"[Function]"` and EC's `<Code>` component refuses to render —
 * mid-response, truncating the page. A root `ec.config.mjs` is EC's supported
 * channel for non-serializable options and is merged over the integration
 * options in both the Markdown and `<Code>` paths.
 *
 * Sites that never import `<Code>` need none of this: the plugin passes the
 * callback through Starlight's config on its own. Sites that do should create
 * `ec.config.mjs` next to `astro.config.mjs`:
 *
 * ```js
 * // ec.config.mjs
 * import { chameleonExpressiveCode } from 'starlight-theme-chameleon/ec-config'
 *
 * export default chameleonExpressiveCode()
 * ```
 *
 * The plugin detects the file and stops forwarding the callback itself, which
 * is what makes `<Code>` work again.
 *
 * Two constraints follow from `ec.config.mjs` being loaded by Node's own
 * `import()` during config setup rather than through Vite, and both apply to
 * everything reachable from here:
 *
 * - Relative imports need explicit `.ts` extensions — Node's ESM resolver does
 *   no extension guessing. Astro's base `tsconfig.json` already enables
 *   `allowImportingTsExtensions`, so TypeScript is happy with them too.
 * - Nothing may import Astro, Starlight, or Node-only modules, and the TypeScript
 *   must stay type-strippable (no `enum`, no namespaces, no parameter properties),
 *   because Node erases types rather than compiling them.
 */

import {
  makeThemeCssSelector,
  resolveSkinThemes,
  toBaseThemes,
  type ChameleonThemeCssSelector,
} from './expressive-code.ts'
import { resolveConfig, type ChameleonSkin, type ChameleonCodeTheme } from './skins.ts'

export interface ChameleonEcConfigOptions {
  /**
   * Built-in skins the site offers, matching the plugin's `skins` option.
   * Defaults to all built-in skins, which is safe even when the site offers
   * fewer: selectors for skins that were never registered are never consulted.
   */
  skins?: string[]
  /** Custom skins the site supplies, matching the plugin's `customSkins` option. */
  customSkins?: ChameleonSkin[]
  /**
   * The site's own `expressiveCode.themes`, if it sets any.
   *
   * Only needed when the site overrides the base syntax themes *and* a skin
   * pairs one of them — repeating them here keeps that theme on Starlight's
   * plain `[data-theme]` mapping instead of scoping it to a single skin.
   */
  themes?: ChameleonCodeTheme | ChameleonCodeTheme[]
}

export interface ChameleonEcConfig {
  themeCssSelector: ChameleonThemeCssSelector
}

/**
 * Build the Expressive Code options that cannot travel through Starlight's
 * config, for use as the default export of a root `ec.config.mjs`.
 *
 * Spread the result if the site has EC options of its own:
 *
 * ```js
 * export default { ...chameleonExpressiveCode(), styleOverrides: { ... } }
 * ```
 */
export function chameleonExpressiveCode(options: ChameleonEcConfigOptions = {}): ChameleonEcConfig {
  const { skins } = resolveConfig(options)
  const { skinSelectors } = resolveSkinThemes(skins, toBaseThemes(options.themes))
  return { themeCssSelector: makeThemeCssSelector(skinSelectors) }
}

export type { ChameleonThemeCssSelector }
