import type { StarlightPlugin } from '@astrojs/starlight/types'

import { resolveConfig, type StarlightPulsarUserConfig } from './lib/config'

export type {
  BuiltInTuneName,
  CustomTuneConfig,
  PlayerPosition,
  ResolvedTune,
  SamplesConfig,
  StarlightPulsarUserConfig,
} from './lib/config'
export { pulsarSchema, type PulsarFrontmatter } from './schema'
export { defineTune, type Tune } from './tune'

const VIRTUAL_MODULE_ID = 'virtual:starlight-pulsar/config'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export default function starlightPulsar(userConfig: StarlightPulsarUserConfig = {}): StarlightPlugin {
  const { tunes, samples, position } = resolveConfig(userConfig)

  return {
    name: 'starlight-pulsar',
    hooks: {
      'i18n:setup'({ injectTranslations }) {
        // The site supports English and German. Tune labels are proper nouns
        // chosen by the site author and are not shown by the compact player.
        injectTranslations({
          en: {
            'starlightPulsar.player.play': 'Play tune',
            'starlightPulsar.player.pause': 'Pause tune',
            'starlightPulsar.player.loading': 'Loading tune',
            'starlightPulsar.player.previous': 'Previous tune',
            'starlightPulsar.player.next': 'Next tune',
          },
          de: {
            'starlightPulsar.player.play': 'Stück abspielen',
            'starlightPulsar.player.pause': 'Stück pausieren',
            'starlightPulsar.player.loading': 'Stück wird geladen',
            'starlightPulsar.player.previous': 'Vorheriges Stück',
            'starlightPulsar.player.next': 'Nächstes Stück',
          },
        })
      },

      'config:setup'({ logger, addIntegration }) {
        // The player validates page playlists at render time and imports tune
        // modules lazily at play time. Both come through this virtual module:
        // the loader map is generated with literal specifiers so the bundler
        // can see every candidate — a bare `import(runtimeName)` would not
        // survive bundling.
        addIntegration({
          name: 'starlight-pulsar',
          hooks: {
            'astro:config:setup'({ updateConfig: updateAstroConfig }) {
              updateAstroConfig({
                vite: {
                  plugins: [
                    {
                      name: 'vite-plugin-starlight-pulsar',
                      resolveId(id) {
                        if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID
                        return undefined
                      },
                      load(id) {
                        if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined
                        const publicConfig = {
                          tunes: tunes.map(({ name, label }) => ({ name, label })),
                          samples: samples ?? null,
                          position,
                        }
                        const loaders = tunes
                          .map(({ name, module }) => `  ${JSON.stringify(name)}: () => import(${JSON.stringify(module)})`)
                          .join(',\n')
                        return (
                          `export default ${JSON.stringify(publicConfig)}\n` +
                          `export const tuneLoaders = {\n${loaders}\n}\n`
                        )
                      },
                    },
                  ],
                },
              })
            },
          },
        })

        logger.info(
          tunes.length === 0
            ? 'No tunes registered — pages cannot configure background music.'
            : `Registered ${tunes.length} tune${tunes.length === 1 ? '' : 's'}: ${tunes.map((t) => t.name).join(', ')}`
        )
      },
    },
  }
}
