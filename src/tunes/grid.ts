import { defineTune } from '../lib/tune'

export default defineTune({
  // 96 bpm in 4/4 — one bar per cycle.
  cps: 96 / 60 / 4,
  gain: 0.5,
  pulse: { steps: 8, hits: [0, 5] },
  pattern: () =>
    stack(
      // Kick on 1 and the "and" of 3.
      s('sbd ~ ~ ~ ~ sbd ~ ~').gain(0.9).lpf(180),

      s('~ white')
        .fast(4)
        .decay(0.035)
        .sustain(0)
        .hpf(7200)
        .gain(saw.range(0.1, 0.22).fast(2))
        .pan(0.62)
        .mask('<1 1 1 0>'),


      s('~ ~ ~ ~ ~ ~ ~ white').decay(0.12).sustain(0).hpf(4200).gain(0.12).pan(0.4),

      // Bass walks under a filter that opens across ? bars.
      note('<[c2 ~ eb2 ~ g2 ~ eb2 ~]*2 [ab1 ~ c2 ~ eb2 ~ c2 ~]*2>')
        .slow(2)
        .s('square')
        .attack(0.005)
        .decay(0.18)
        .sustain(0.15)
        .release(0.1)
        .lpf(cosine
            .range(1, 0)       // Start low
            .pow(4)            // Narrow the peak
            .range(280, 900)
            .slow(8))
        .lpq(6)
        .room(0.18)
        .roomsize(7)
        .roomfade(3)
        .roomlp(1800)
        .orbit(2)
        .gain(0.6),

      // One held chord per bar, well back in the mix.
      note('<[c4,eb4,g4] [ab3,c4,eb4]>')
        .slow(2)
        .s('triangle')
        .attack(0.6)
        .release(1.4)
        .lpf(560)
        .lfo({
          control: 'lpf',
          sync: 2,
          depthabs: 400,
          shape: 'ramp',
        })
        .lpq(11)
        .ftype('24db')
        .gain(0.2)
        .pan(sine.range(0.4, 0.6).slow(12))

    ),
})
