/** Tunes that ship with Pulsar. Synth-only — see `tunes/README` reasoning in the package CONTEXT. */
export const BUILT_IN_TUNES = ['drift', 'grid'] as const

export type BuiltInTuneName = (typeof BUILT_IN_TUNES)[number]

/** A tune the site author wrote, registered alongside the built-ins. */
export interface CustomTuneConfig {
  /** Stable id used in page frontmatter and in `localStorage`. */
  name: string
  /** Reader-facing name. Defaults to `name` when omitted. */
  label?: string
  /**
   * Module specifier exporting a `defineTune(...)` default export. Resolved by
   * the site's bundler, so anything importable from the site works — a package
   * name, or a path alias like `/src/tunes/foo.ts`.
   */
  module: string
}

export interface SamplesConfig {
  /** Base URL the site serves its own samples from, e.g. `/audio/`. */
  base: string
  /** Strudel sample map, passed to `samples()` during engine prebake. */
  map: Record<string, unknown>
}

export interface StarlightPulsarUserConfig {
  /**
   * Tunes to register: built-in names, custom tune objects, or a mix. Order is
   * the order the selector lists them. Defaults to every built-in.
   */
  tunes?: Array<BuiltInTuneName | (string & {}) | CustomTuneConfig>
  /**
   * Self-hosted samples for custom tunes. Built-in tunes never need this — the
   * whole point of synth-only built-ins is that installing Pulsar adds no
   * network fetch and no sample license.
   */
  samples?: SamplesConfig
  /**
   * Where the tune selector renders.
   *
   * - `manual` (default) — Pulsar claims no component slot; the site imports
   *   the control and places it in a slot it already owns.
   * - `themeselect` — Pulsar claims Starlight's `ThemeSelect` slot when free,
   *   and logs when it isn't. A convenience for sites running nothing else in
   *   the header.
   */
  control?: 'manual' | 'themeselect'
}

/** A tune after resolution: always has a label and a module specifier. */
export interface ResolvedTune {
  name: string
  label: string
  module: string
}

export interface ResolvedPulsarConfig {
  tunes: ResolvedTune[]
  samples: SamplesConfig | undefined
  control: 'manual' | 'themeselect'
}

/** Title-cases a built-in name for its default label: `drift` → `Drift`. */
function defaultLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function resolveConfig(userConfig: StarlightPulsarUserConfig = {}): ResolvedPulsarConfig {
  const requested = userConfig.tunes ?? [...BUILT_IN_TUNES]

  const tunes: ResolvedTune[] = []
  const seen = new Set<string>()

  for (const entry of requested) {
    const tune: ResolvedTune =
      typeof entry === 'string'
        ? {
            name: entry,
            label: defaultLabel(entry),
            module: `starlight-pulsar/tunes/${entry}.ts`,
          }
        : {
            name: entry.name,
            label: entry.label ?? entry.name,
            module: entry.module,
          }

    if (typeof entry === 'string' && !(BUILT_IN_TUNES as readonly string[]).includes(entry)) {
      throw new Error(
        `starlight-pulsar: \`${entry}\` is not a built-in tune. ` +
          `Built-ins are ${BUILT_IN_TUNES.join(', ')}. ` +
          'Register a custom tune as `{ name, label, module }` instead.'
      )
    }

    // Names address tunes in frontmatter and in the reader's stored selection,
    // so a duplicate would make `music: foo` ambiguous and could silently
    // repoint a reader's saved pick at a different tune.
    if (seen.has(tune.name)) {
      throw new Error(`starlight-pulsar: duplicate tune name \`${tune.name}\`. Tune names must be unique.`)
    }
    seen.add(tune.name)

    tunes.push(tune)
  }

  return {
    tunes,
    samples: userConfig.samples,
    control: userConfig.control ?? 'manual',
  }
}
