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
        const { skins, skinSelector, themeSelector, ecConfigFile } = resolveConfig(userConfig)
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

        // Per-skin syntax themes need EC's `themeCssSelector`, which EC only
        // accepts as a callback. Starlight serializes the options it forwards
        // to the EC integration, so a callback sent that way reaches EC's
        // `<Code>` component as `"[Function]"` and makes it throw mid-render —
        // truncating the response instead of showing an error. The callback's
        // one channel that also serves `<Code>` is a root `ec.config.mjs`, so
        // when that file carries Chameleon's options (see `lib/ec-config.ts`)
        // we keep the callback out of Starlight's config. Full reasoning in
        // `docs/expressive-code.md`.
        const composed = composeExpressiveCodeConfig(skins, config.expressiveCode)
        const deferToEcConfigFile = composed !== undefined && resolveEcConfigFileHandover(ecConfigFile, astroConfig.root, logger)

        updateConfig({
          customCss,
          components,
          head,
          ...(composed
            ? {
                expressiveCode: {
                  ...composed.options,
                  ...(deferToEcConfigFile ? {} : { themeCssSelector: composed.themeCssSelector }),
                } as never,
              }
            : {}),
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

/** The snippet that makes an `ec.config.mjs` carry Chameleon's options. */
const EC_CONFIG_SNIPPET =
  "  import { chameleonExpressiveCode } from 'starlight-theme-chameleon/ec-config'\n" +
  '  export default chameleonExpressiveCode()'

/**
 * Decide whether to hand Chameleon's `themeCssSelector` over to the site's
 * `ec.config.mjs` instead of forwarding it through Starlight's config, and
 * report whichever way the site's setup falls short.
 *
 * `ec.config.mjs` is the only name Expressive Code looks for, resolved against
 * the Astro project root.
 */
function resolveEcConfigFileHandover(
  ecConfigFile: boolean | undefined,
  root: URL,
  logger: { warn(message: string): void }
): boolean {
  // Opted out: the site accepts that `<Code>` is unusable, so say nothing.
  if (ecConfigFile === false) return false

  let path: string | undefined
  try {
    path = fileURLToPath(new URL('./ec.config.mjs', root))
  } catch {
    path = undefined
  }
  const exists = path !== undefined && fs.existsSync(path)

  if (!exists) {
    // Opted in but nothing to hand over to. Stepping aside here would drop
    // per-skin syntax themes silently, so refuse the contradiction outright.
    if (ecConfigFile === true) {
      fail(
        'The `ecConfigFile` option is `true`, but no `ec.config.mjs` was found next to your Astro config. ' +
          'Chameleon stops supplying its per-skin syntax themes when that file is meant to carry them. ' +
          'Either create it:\n' +
          EC_CONFIG_SNIPPET +
          '\nor set `ecConfigFile: false` to have Chameleon keep supplying them ' +
          '(which leaves Expressive Code’s `<Code>` component unusable).'
      )
    }
    logger.warn(
      'Per-skin syntax themes are configured, which makes Expressive Code’s `<Code>` component unusable site-wide: ' +
        'it throws while rendering and silently truncates the page. ' +
        'To use `<Code>`, create an `ec.config.mjs` next to your Astro config containing:\n' +
        EC_CONFIG_SNIPPET +
        '\nMarkdown and MDX code fences are unaffected either way. ' +
        'Set `ecConfigFile: false` to silence this if the site never imports `<Code>`.'
    )
    return false
  }

  // The file exists, so Chameleon steps aside — but it can only step aside
  // usefully if the file actually calls the helper. Chameleon cannot see what
  // Expressive Code merged, so check the source the same way custom skin CSS
  // is checked. A false negative is possible (the call may be re-exported from
  // another module), hence a warning rather than a hard failure.
  let source: string | undefined
  try {
    source = fs.readFileSync(path!, 'utf-8')
  } catch {
    source = undefined
  }
  if (source !== undefined && !source.includes('chameleonExpressiveCode')) {
    logger.warn(
      '`ec.config.mjs` does not appear to call `chameleonExpressiveCode()`. ' +
        'Code blocks will keep the base syntax themes instead of following the active skin. Add:\n' +
        EC_CONFIG_SNIPPET +
        '\nor spread it into the existing default export. If the call is supplied indirectly, ignore this.'
    )
  }
  return true
}

/**
 * Fail the build with the plugin's own prefix, matching `lib/skins.ts`.
 */
function fail(message: string): never {
  throw new Error(`starlight-theme-chameleon: ${message}`)
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
