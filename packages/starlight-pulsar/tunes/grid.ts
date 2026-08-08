import { defineTune } from '../tune'

/**
 * Grid — a quiet, steady pulse for pages that want motion rather than mood.
 *
 * Synth-only, like every built-in: `sbd` is Strudel's synthesized bass drum,
 * `white` its generated noise buffer, and the rest are plain oscillators. No
 * sample fetch, no soundfont host, nothing to license.
 *
 * Deliberately under-arranged. It accompanies a page of text, so
 * it holds one groove and lets the filter and the bass do the changing.
 */
export default defineTune({
  label: 'Grid',
  // 96 bpm in 4/4 — one bar per cycle.
  cps: 96 / 60 / 4,
  gain: 0.5,
  pattern: () =>
    stack(
      // Kick on 1 and the "and" of 3.
      s('sbd ~ ~ ~ ~ sbd ~ ~').gain(0.9).lpf(180),

      // Noise hats on the offbeats, breathing rather than ticking, and sitting
      // out every fourth bar so the loop has somewhere to land.
      s('~ white')
        .fast(4)
        .decay(0.035)
        .sustain(0)
        .hpf(7200)
        .gain(saw.range(0.1, 0.22).fast(2))
        .pan(0.62)
        .mask('<1 1 1 0>'),

      // Softer noise accent closing each bar.
      s('~ ~ ~ ~ ~ ~ ~ white').decay(0.12).sustain(0).hpf(4200).gain(0.12).pan(0.4),

      // Bass walks under a filter that opens across two bars.
      note('<[c2 ~ eb2 ~ g2 ~ eb2 ~] [ab1 ~ c2 ~ eb2 ~ c2 ~]>')
        .s('sawtooth')
        .attack(0.005)
        .decay(0.18)
        .sustain(0.15)
        .release(0.1)
        .lpf(sine.range(280, 900).slow(8))
        .lpq(6)
        .gain(0.6),

      // One held chord per bar, well back in the mix.
      note('<[c4,eb4,g4] [ab3,c4,eb4]>')
        .s('triangle')
        .attack(0.6)
        .release(1.4)
        .lpf(1600)
        .gain(0.2)
        .pan(sine.range(0.4, 0.6).slow(6))
    ),
})
