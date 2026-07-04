import type { StarlightPlugin } from '@astrojs/starlight/types'

export interface ChameleonSkin {
  /** Identifier used to activate the skin, e.g. `"nordic"`. Lowercase letters and dashes only. */
  name: string
  /** Label shown to readers in the skin picker. May be a plain string or a record keyed by locale. */
  label: string | Record<string, string>
  /** Module specifier of the skin's CSS file, e.g. `"./src/styles/skins/my-skin.css"`. */
  css: string
}

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
   * Whether readers can switch skins via the picker.
   * When `false`, the first configured skin is pinned site-wide.
   * @default true
   */
  picker?: boolean
}

export default function starlightThemeChameleon(
  userConfig: StarlightThemeChameleonUserConfig = {},
): StarlightPlugin {
  return {
    name: 'starlight-theme-chameleon',
    hooks: {
      'config:setup'({ config, logger, updateConfig }) {
        // Skeleton: skin registration, the ThemeSelect override, and
        // Expressive Code pairing land in later phases (see docs/plans/).
        void userConfig

        updateConfig({
          customCss: ['starlight-theme-chameleon/styles/base.css', ...(config.customCss ?? [])],
        })

        logger.info('Chameleon skeleton active — no skins registered yet.')
      },
    },
  }
}
