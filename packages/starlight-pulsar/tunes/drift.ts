import { defineTune } from '../tune'

/**
 * Drift — a slow ambient pad in C minor, for reading against.
 *
 * Synth-only: sine and triangle oscillators, no samples, no soundfonts, no
 * network. Everything here is registered by `registerSynthSounds()`, which
 * `initStrudel()` runs on its own.
 *
 * Written to stay out of the way. Long attacks so nothing has an edge to catch
 * the ear on, a filter that moves slower than the chord changes, and a top
 * voice sparse enough to read as punctuation rather than melody.
 */
export default defineTune({
  label: 'Drift',
  // ~17 s per cycle. One chord per cycle, so the harmony turns about as often
  // as a reader finishes a paragraph.
  cps: 0.06,
  gain: 0.55,
  pattern: () =>
    stack(
      // Root drone, an octave below the pad, doubled at the fifth on the
      // second half of the progression to keep it from going static.
      note('<c2 ab1 f1 g1>')
        .s('sine')
        .attack(3)
        .decay(2)
        .sustain(0.8)
        .release(5)
        .lpf(360)
        .gain(0.85),

      // The pad itself: four chords of C minor, each held the full cycle.
      note('<[c3,eb3,g3] [ab2,c3,eb3] [f2,ab2,c3] [g2,bb2,d3]>')
        .s('triangle')
        .attack(4)
        .decay(3)
        .sustain(0.7)
        .release(6)
        // Slower than the progression, so the brightness never lines up with
        // the chord change — that mismatch is what stops it sounding looped.
        .lpf(sine.range(420, 1250).slow(7))
        .lpq(4)
        .gain(0.42)
        .pan(sine.range(0.35, 0.65).slow(11)),

      // Occasional high note, two cycles out of every eight.
      note('<~ ~ eb5 ~ ~ g5 ~ c6>')
        .s('sine')
        .attack(1.5)
        .release(4)
        .gain(0.18)
        .pan(sine.range(0.7, 0.3).slow(5))
        .delay(0.35)
        .delaytime(0.75)
        .delayfeedback(0.45)
    ),
})
