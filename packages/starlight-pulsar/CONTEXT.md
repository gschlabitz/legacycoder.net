# Pulsar

Pulsar is this repo's Starlight plugin for page-scoped Strudel tunes.

## Agent guide

- Register tunes through the plugin's `tunes` configuration. Built-ins are
  synth-only; custom tunes may use site-hosted samples.
- A page opts in with `music: tune-name` or an ordered list of tune names and
  renders `Player.astro`. Treat that list as the complete playlist for the
  page.
- The player floats at the configured nine-point viewport position. One tune
  shows Play/Pause; multiple tunes also show Previous and Next.
- Playback always requires a click. The Strudel engine loads on first play and
  audio does not continue across page navigation.
- While playing, Play/Pause expands left into a capsule. Its icon stays fixed
  and a mini oscilloscope fades in on the left.
- Pausing or changing tunes stores a per-tune bookmark for later resumption.
- A tune may declare cycle-relative `pulse` steps for synchronized page visuals.
- Do not add a global tune selector, autoplay, Stop, or Off control.

Use **tune**, **page playlist**, **player**, **armed**, and **bookmark** for the
main concepts.
