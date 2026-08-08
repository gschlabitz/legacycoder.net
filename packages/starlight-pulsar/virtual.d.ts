/** Typed player UI strings for `Astro.locals.t` (Starlight plugin-translations pattern). */
declare namespace StarlightApp {
  interface I18n {
    'starlightPulsar.player.play': string
    'starlightPulsar.player.pause': string
    'starlightPulsar.player.loading': string
    'starlightPulsar.player.previous': string
    'starlightPulsar.player.next': string
  }
}

declare module 'virtual:starlight-pulsar/config' {
  import type { Tune } from 'starlight-pulsar/tune'

  /** Reader-facing subset of the resolved Pulsar config, generated at build time. */
  const config: {
    tunes: Array<{ name: string; label: string }>
    samples: { base: string; map: Record<string, unknown> } | null
    position: import('starlight-pulsar').PlayerPosition
  }
  export default config

  /**
   * Lazy importers for every registered tune, keyed by name. Generated with
   * literal specifiers so the bundler can see each candidate.
   */
  export const tuneLoaders: Record<string, () => Promise<{ default: Tune }>>
}
