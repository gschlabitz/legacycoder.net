/**
 * A tune is a module, not a string.
 *
 * Strudel's mini-notation works inside an ordinary module — `@strudel/mini`
 * registers itself as core's string parser — so `s("sine*4")` and
 * `note("<c a f e>")` parse without the transpiler. That means no `eval`, and
 * no eval sink handed to adopters through page frontmatter: a page names a
 * tune. Page-specific tune components register these definitions with the
 * reusable player when their page loads.
 */
export interface Tune {
  /** Stable id used for playback state. */
  name: string
  /**
   * Cycles per second. Separate from the pattern because the scheduler needs
   * the tempo before the pattern is scheduled.
   */
  cps: number
  /**
   * Playback level, 0–1. Separate from the pattern so tunes can be levelled
   * against each other at authoring time: switching from a pad to a kick
   * pattern should not be a volume event. There is no reader-facing volume.
   */
  gain?: number
  /** Optional visual pulse positions within one cycle. */
  pulse?: {
    steps: number
    hits: number[]
  }
  /**
   * Builds the pattern. Called after the engine is initialised, so Strudel's
   * pattern constructors are in scope as globals (`initStrudel` assigns them
   * to `globalThis`). Called once per playback, never at import time.
   */
  pattern: () => StrudelPattern
}

/**
 * Strudel's pattern type, kept loose on purpose. `@strudel/core`'s dist bundle
 * imports browser-only `@kabelsalat/web`, so importing it for real types would
 * drag a browser dependency into every consumer's typecheck — and Strudel
 * registers its controls at runtime anyway, so no static list would stay true.
 *
 * The method the player itself depends on is named; everything else chains.
 */
export interface StrudelPattern {
  /** Multiply a control: `.mul(gain(0.5))` scales without overwriting it. */
  mul(other: unknown): StrudelPattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any
}

/** Identity helper that gives a tune module its type without a type annotation. */
export function defineTune(tune: Tune): Tune {
  return tune
}

const registered = new Map<string, Tune>()

/** Register one page-owned tune with the player on the current page. */
export function registerTune(tune: Tune): void {
  registered.set(tune.name, tune)
  window.dispatchEvent(new CustomEvent('tune-player:tunes-changed'))
}

/** The current page's tunes, in registration order. */
export function getTunes(): Tune[] {
  return [...registered.values()]
}
