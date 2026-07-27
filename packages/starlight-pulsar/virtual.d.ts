/** Typed tune selector UI strings for `Astro.locals.t` (Starlight plugin-translations pattern). */
declare namespace StarlightApp {
  interface I18n {
    'starlightPulsar.tuneSelect.accessibleLabel': string
    'starlightPulsar.tuneSelect.off': string
    'starlightPulsar.tuneSelect.auto': string
    'starlightPulsar.tuneSelect.play': string
    'starlightPulsar.tuneSelect.pause': string
  }
}

declare module 'virtual:starlight-pulsar/config' {
  import type { Tune } from 'starlight-pulsar/tune'

  /** Reader-facing subset of the resolved Pulsar config, generated at build time. */
  const config: {
    tunes: Array<{ name: string; label: string }>
    samples: { base: string; map: Record<string, unknown> } | null
  }
  export default config

  /**
   * Lazy importers for every registered tune, keyed by name. Generated with
   * literal specifiers so the bundler can see each candidate.
   */
  export const tuneLoaders: Record<string, () => Promise<{ default: Tune }>>
}
