/**
 * Strudel's pattern constructors, as globals.
 *
 * `initStrudel()` assigns core, mini, tonal and webaudio exports onto
 * `globalThis`, and tune modules are imported *after* the engine is up — so a
 * tune's `pattern()` body can call these directly. That is what keeps a tune
 * readable as music rather than as import plumbing.
 *
 * Typed loosely on purpose. `@strudel/core`'s dist bundle imports browser-only
 * `@kabelsalat/web`, so pulling real types in would drag a browser dependency
 * into every consumer's typecheck for no gain — these are authoring aids, and
 * the engine is the actual arbiter of what works.
 */
import type { StrudelPattern } from './tune'

declare global {
  /** Layers patterns so they sound together. */
  function stack(...patterns: unknown[]): StrudelPattern
  /** Plays patterns one cycle each, in turn. */
  function cat(...patterns: unknown[]): StrudelPattern
  /** `cat`, but stretched so the whole list takes one cycle. */
  function seq(...patterns: unknown[]): StrudelPattern
  /** Alias of `seq`. */
  function sequence(...patterns: unknown[]): StrudelPattern
  /** One item per cycle — what `<a b c>` desugars to. */
  function slowcat(...patterns: unknown[]): StrudelPattern
  /** Silence. */
  const silence: StrudelPattern

  /** Notes by name or number: `note("c3 eb3")`. */
  function note(pattern: unknown): StrudelPattern
  /** Sound source by name: `s("sine")`, `s("sbd")`. */
  function s(pattern: unknown): StrudelPattern
  /** Frequency in Hz. */
  function freq(pattern: unknown): StrudelPattern
  /** Bare numeric pattern. */
  function n(pattern: unknown): StrudelPattern

  /** Continuous signals, 0–1 unless bipolar. */
  const sine: StrudelPattern
  const cosine: StrudelPattern
  const saw: StrudelPattern
  const isaw: StrudelPattern
  const tri: StrudelPattern
  const square: StrudelPattern
  const perlin: StrudelPattern
  const rand: StrudelPattern
  /** Random integers in `[0, n)`. */
  function irand(max: number): StrudelPattern
  /** Picks one of its arguments at random, per event. */
  function choose(...values: unknown[]): StrudelPattern
}

export {}
