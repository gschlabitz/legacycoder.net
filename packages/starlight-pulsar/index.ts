import type { StarlightPlugin } from '@astrojs/starlight/types'

import { resolveConfig, type StarlightPulsarUserConfig } from './lib/config'

export type {
  BuiltInTuneName,
  CustomTuneConfig,
  ResolvedTune,
  SamplesConfig,
  StarlightPulsarUserConfig,
} from './lib/config'
export { pulsarSchema, type PulsarFrontmatter } from './schema'
export { defineTune, type Tune } from './tune'

const VIRTUAL_MODULE_ID = 'virtual:starlight-pulsar/config'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export default function starlightPulsar(userConfig: StarlightPulsarUserConfig = {}): StarlightPlugin {
  const { tunes, samples, control } = resolveConfig(userConfig)

  return {
    name: 'starlight-pulsar',
    hooks: {
      'i18n:setup'({ injectTranslations }) {
        // Nine strings, in the ten languages Chameleon ships. Tune labels are
        // deliberately absent: they are proper nouns chosen by the site author,
        // like skin names, and are never translated.
        //
        // `play` and `pause` label the transport, which swaps between them: a
        // button that starts music must not announce itself as a picker.
        injectTranslations({
          en: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Select background music',
            'starlightPulsar.tuneSelect.off': 'Off',
            'starlightPulsar.tuneSelect.auto': 'Auto',
            'starlightPulsar.tuneSelect.play': 'Play background music',
            'starlightPulsar.tuneSelect.pause': 'Pause background music',
            'starlightPulsar.tuneSelect.previous': 'Previous tune',
            'starlightPulsar.tuneSelect.next': 'Next tune',
            'starlightPulsar.tuneSelect.stop': 'Stop and turn off',
            'starlightPulsar.tuneSelect.nothing': 'Nothing here',
          },
          de: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Hintergrundmusik auswählen',
            'starlightPulsar.tuneSelect.off': 'Aus',
            'starlightPulsar.tuneSelect.auto': 'Automatisch',
            'starlightPulsar.tuneSelect.play': 'Hintergrundmusik abspielen',
            'starlightPulsar.tuneSelect.pause': 'Hintergrundmusik pausieren',
            'starlightPulsar.tuneSelect.previous': 'Vorheriges Stück',
            'starlightPulsar.tuneSelect.next': 'Nächstes Stück',
            'starlightPulsar.tuneSelect.stop': 'Anhalten und ausschalten',
            'starlightPulsar.tuneSelect.nothing': 'Nichts hier',
          },
          'zh-CN': {
            'starlightPulsar.tuneSelect.accessibleLabel': '选择背景音乐',
            'starlightPulsar.tuneSelect.off': '关闭',
            'starlightPulsar.tuneSelect.auto': '自动',
            'starlightPulsar.tuneSelect.play': '播放背景音乐',
            'starlightPulsar.tuneSelect.pause': '暂停背景音乐',
            'starlightPulsar.tuneSelect.previous': '上一首',
            'starlightPulsar.tuneSelect.next': '下一首',
            'starlightPulsar.tuneSelect.stop': '停止并关闭',
            'starlightPulsar.tuneSelect.nothing': '此处无音乐',
          },
          es: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Seleccionar música de fondo',
            'starlightPulsar.tuneSelect.off': 'Apagado',
            'starlightPulsar.tuneSelect.auto': 'Automático',
            'starlightPulsar.tuneSelect.play': 'Reproducir música de fondo',
            'starlightPulsar.tuneSelect.pause': 'Pausar música de fondo',
            'starlightPulsar.tuneSelect.previous': 'Pista anterior',
            'starlightPulsar.tuneSelect.next': 'Pista siguiente',
            'starlightPulsar.tuneSelect.stop': 'Detener y apagar',
            'starlightPulsar.tuneSelect.nothing': 'Nada aquí',
          },
          fr: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Sélectionner la musique de fond',
            'starlightPulsar.tuneSelect.off': 'Désactivé',
            'starlightPulsar.tuneSelect.auto': 'Automatique',
            'starlightPulsar.tuneSelect.play': 'Lire la musique de fond',
            'starlightPulsar.tuneSelect.pause': 'Mettre en pause la musique de fond',
            'starlightPulsar.tuneSelect.previous': 'Morceau précédent',
            'starlightPulsar.tuneSelect.next': 'Morceau suivant',
            'starlightPulsar.tuneSelect.stop': 'Arrêter et désactiver',
            'starlightPulsar.tuneSelect.nothing': 'Rien ici',
          },
          ja: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'バックグラウンド音楽を選択',
            'starlightPulsar.tuneSelect.off': 'オフ',
            'starlightPulsar.tuneSelect.auto': '自動',
            'starlightPulsar.tuneSelect.play': 'バックグラウンド音楽を再生',
            'starlightPulsar.tuneSelect.pause': 'バックグラウンド音楽を一時停止',
            'starlightPulsar.tuneSelect.previous': '前の曲',
            'starlightPulsar.tuneSelect.next': '次の曲',
            'starlightPulsar.tuneSelect.stop': '停止してオフにする',
            'starlightPulsar.tuneSelect.nothing': 'ここには何もありません',
          },
          ko: {
            'starlightPulsar.tuneSelect.accessibleLabel': '배경 음악 선택',
            'starlightPulsar.tuneSelect.off': '끄기',
            'starlightPulsar.tuneSelect.auto': '자동',
            'starlightPulsar.tuneSelect.play': '배경 음악 재생',
            'starlightPulsar.tuneSelect.pause': '배경 음악 일시정지',
            'starlightPulsar.tuneSelect.previous': '이전 곡',
            'starlightPulsar.tuneSelect.next': '다음 곡',
            'starlightPulsar.tuneSelect.stop': '정지하고 끄기',
            'starlightPulsar.tuneSelect.nothing': '여기에는 없음',
          },
          pt: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Selecionar música de fundo',
            'starlightPulsar.tuneSelect.off': 'Desligado',
            'starlightPulsar.tuneSelect.auto': 'Automático',
            'starlightPulsar.tuneSelect.play': 'Reproduzir música de fundo',
            'starlightPulsar.tuneSelect.pause': 'Pausar música de fundo',
            'starlightPulsar.tuneSelect.previous': 'Faixa anterior',
            'starlightPulsar.tuneSelect.next': 'Próxima faixa',
            'starlightPulsar.tuneSelect.stop': 'Parar e desligar',
            'starlightPulsar.tuneSelect.nothing': 'Nada aqui',
          },
          ru: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Выбрать фоновую музыку',
            'starlightPulsar.tuneSelect.off': 'Выключено',
            'starlightPulsar.tuneSelect.auto': 'Авто',
            'starlightPulsar.tuneSelect.play': 'Воспроизвести фоновую музыку',
            'starlightPulsar.tuneSelect.pause': 'Приостановить фоновую музыку',
            'starlightPulsar.tuneSelect.previous': 'Предыдущий трек',
            'starlightPulsar.tuneSelect.next': 'Следующий трек',
            'starlightPulsar.tuneSelect.stop': 'Остановить и выключить',
            'starlightPulsar.tuneSelect.nothing': 'Здесь ничего нет',
          },
          it: {
            'starlightPulsar.tuneSelect.accessibleLabel': 'Seleziona musica di sottofondo',
            'starlightPulsar.tuneSelect.off': 'Spento',
            'starlightPulsar.tuneSelect.auto': 'Automatico',
            'starlightPulsar.tuneSelect.play': 'Riproduci musica di sottofondo',
            'starlightPulsar.tuneSelect.pause': 'Metti in pausa la musica di sottofondo',
            'starlightPulsar.tuneSelect.previous': 'Brano precedente',
            'starlightPulsar.tuneSelect.next': 'Brano successivo',
            'starlightPulsar.tuneSelect.stop': 'Ferma e spegni',
            'starlightPulsar.tuneSelect.nothing': 'Niente qui',
          },
        })
      },

      'config:setup'({ config, logger, updateConfig, addIntegration }) {
        // Pulsar claims no component slot by default (issue #25). `themeselect`
        // is a convenience for sites running nothing else in the header — and
        // when the slot is taken it says so, rather than silently disabling
        // itself the way a contended slot has bitten this stack before.
        if (control === 'themeselect') {
          if (config.components?.ThemeSelect) {
            logger.warn(
              'A `ThemeSelect` component override is already configured — Pulsar cannot place its tune selector there. ' +
                'Set `control: "manual"` and render `starlight-pulsar/components/TuneSelect.astro` from a slot the site owns.'
            )
          } else {
            updateConfig({
              components: { ...config.components, ThemeSelect: 'starlight-pulsar/components/TuneSelect.astro' },
            })
          }
        }

        // The control reads the tune list at render time, and imports tune
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
            ? 'No tunes registered — the selector will offer Off and Auto only.'
            : `Registered ${tunes.length} tune${tunes.length === 1 ? '' : 's'}: ${tunes.map((t) => t.name).join(', ')}`
        )
      },
    },
  }
}
