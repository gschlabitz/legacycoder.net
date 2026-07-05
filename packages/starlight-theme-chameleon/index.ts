import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { StarlightPlugin } from '@astrojs/starlight/types'

import { composeExpressiveCodeConfig } from './lib/expressive-code'
import { resolveConfig, type ChameleonSkin, type StarlightThemeChameleonUserConfig } from './lib/skins'

export type {
  ChameleonCodeTheme,
  ChameleonSkin,
  ChameleonSkinCode,
  ChameleonSkinSelector,
  ChameleonThemeSelector,
  StarlightThemeChameleonUserConfig,
} from './lib/skins'

/** `localStorage` key holding the reader's skin choice. Separate from Starlight's `starlight-theme` mode key so skin and mode stay orthogonal. */
const STORAGE_KEY = 'starlight-skin'

const VIRTUAL_MODULE_ID = 'virtual:starlight-theme-chameleon/config'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export default function starlightThemeChameleon(
  userConfig: StarlightThemeChameleonUserConfig = {}
): StarlightPlugin {
  return {
    name: 'starlight-theme-chameleon',
    hooks: {
      'i18n:setup'({ injectTranslations }) {
        // The skin selector's only translatable string, shipped in the ten most
        // common languages. Everything readers see in the list is a proper
        // noun — skin names, and "Starlight" for the unskinned look
        // (ADR 0004). Sites can supply further languages through Starlight's
        // i18n collection; the component falls back to English when the key
        // resolves nowhere.
        const key = 'starlightThemeChameleon.skinSelect.accessibleLabel'
        injectTranslations({
          en: { [key]: 'Select skin' },
          'zh-CN': { [key]: '选择皮肤' },
          es: { [key]: 'Seleccionar skin' },
          fr: { [key]: 'Sélectionner un skin' },
          de: { [key]: 'Skin auswählen' },
          ja: { [key]: 'スキンを選択' },
          ko: { [key]: '스킨 선택' },
          pt: { [key]: 'Selecionar skin' },
          ru: { [key]: 'Выбрать скин' },
          it: { [key]: 'Seleziona skin' },
        })
      },
      'config:setup'({ config, logger, updateConfig, addIntegration, astroConfig }) {
        const { skins, skinSelector, themeSelector } = resolveConfig(userConfig)
        const skinNames = skins.map((skin) => skin.name)

        warnOnUnscopedSkinCss(skins, astroConfig.root, logger)

        // Every skin is compiled into the site, scoped under its
        // `[data-skin]` attribute (ADR 0001). Skins come after the site's own
        // custom CSS so an active skin wins ties against site-wide tweaks;
        // while no skin is active none of their rules match at all.
        const customCss = [
          'starlight-theme-chameleon/styles/base.css',
          ...(config.customCss ?? []),
          ...skins.map((skin) => skin.css),
        ]

        // Chameleon's selectors claim one component slot, `ThemeSelect`
        // (ADR 0002), only when they need to render in the header.
        const components = { ...config.components }
        const needsThemeSelectOverride = skinSelector !== 'hidden' || themeSelector === 'icon'
        let activeSkinSelector = skinSelector
        let activeThemeSelector = themeSelector
        if (needsThemeSelectOverride) {
          if (components.ThemeSelect) {
            logger.warn(
              'A `ThemeSelect` component override is already configured — Chameleon cannot add its configured selector controls. ' +
                'If the override comes from starlight-blog, set its `navigation` option to `"header-start"` to free the slot.'
            )
            activeSkinSelector = 'hidden'
            activeThemeSelector = 'select'
          } else {
            components.ThemeSelect = 'starlight-theme-chameleon/components/ThemeSelect.astro'
          }
        }

        // Applied before first paint to avoid a flash of the wrong skin,
        // mirroring Starlight's own light/dark provider.
        const headScript = skinSelector !== 'hidden'
          ? `(()=>{var s=null;try{s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})}catch(e){}` +
            `if(s&&${JSON.stringify(skinNames)}.indexOf(s)>-1)document.documentElement.dataset.skin=s})();`
          : `document.documentElement.dataset.skin=${JSON.stringify(skinNames[0])};`
        const head = [...(config.head ?? []), { tag: 'script' as const, content: headScript }]

        const expressiveCode = composeExpressiveCodeConfig(skins, config.expressiveCode)

        updateConfig({
          customCss,
          components,
          head,
          ...(expressiveCode ? { expressiveCode: expressiveCode as never } : {}),
        })

        // The selector component reads the skin list at render time through a
        // virtual module.
        addIntegration({
          name: 'starlight-theme-chameleon',
          hooks: {
            'astro:config:setup'({ updateConfig: updateAstroConfig }) {
              updateAstroConfig({
                vite: {
                  plugins: [
                    {
                      name: 'vite-plugin-starlight-theme-chameleon',
                      resolveId(id) {
                        if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID
                        return undefined
                      },
                      load(id) {
                        if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined
                        const publicConfig = {
                          skinSelector: activeSkinSelector,
                          themeSelector: activeThemeSelector,
                          skins: skins.map(({ name, label }) => ({ name, label })),
                        }
                        return `export default ${JSON.stringify(publicConfig)}`
                      },
                    },
                  ],
                },
              })
            },
          },
        })

        logger.info(
          `Registered ${skins.length} skin${skins.length === 1 ? '' : 's'}: ${skinNames.join(', ')}` +
            (skinSelector !== 'hidden' ? '' : ` (\`${skinNames[0]}\` pinned site-wide)`)
        )
      },
    },
  }
}

/**
 * Dev-time guard for the scoping invariant: a custom skin's CSS must scope
 * its rules under `[data-skin='<name>']` or it will leak into every skin.
 * Only file-path specifiers can be checked; package specifiers are skipped.
 */
function warnOnUnscopedSkinCss(
  skins: ChameleonSkin[],
  root: URL,
  logger: { warn(message: string): void }
) {
  for (const skin of skins) {
    if (!skin.css.startsWith('.') && !skin.css.startsWith('/')) continue
    let css: string
    try {
      css = fs.readFileSync(fileURLToPath(new URL(skin.css.replace(/^\//, './'), root)), 'utf-8')
    } catch {
      continue
    }
    const scoped = new RegExp(`\\[data-skin=(['"]?)${skin.name}\\1\\]`).test(css)
    if (!scoped) {
      logger.warn(
        `The CSS for skin \`${skin.name}\` (${skin.css}) contains no \`[data-skin='${skin.name}']\` selector. ` +
          'Unscoped rules apply to every skin — scope each rule under the skin attribute.'
      )
    }
  }
}
