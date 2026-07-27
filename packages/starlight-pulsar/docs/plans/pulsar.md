# Plan: page-scoped background music

Motto and doctrine: **the page sets the tune, the reader has the last word**.
A page declares what it sounds like; the reader may override it, silence the
site, or defer. Music never starts without a gesture and never survives a
navigation — see [ADR 0008](../../../../docs/adr/0008-page-scoped-background-music.md).

## Findings (July 2026)

Verified against the pinned `@strudel` 1.3 packages during design.

- **The site is a plain MPA.** No `ClientRouter` anywhere in `src/` or
  `astro.config.mjs`, so a document's `AudioContext` dies at every link
  click. This is the constraint the whole design is shaped around. Adopting
  client-side routing is not a small change either: a Starlight maintainer's
  guidance in
  [withastro/starlight#2823](https://github.com/withastro/starlight/discussions/2823)
  is that `astro-vtbot` is likely needed, and that without it search and the
  mobile menu must be re-verified after navigation — here that list also
  covers the React islands, the CRT backdrop's typing script, and the
  timeline map's scroll-linked camera.
- **Mini-notation works without the transpiler.** `@strudel/mini` registers
  itself as core's string parser (`mini.mjs:260` → `pattern.mjs:1290`), so
  `s("bd ~ sd")` and `note("<c a f e>")` parse inside an ordinary module.
  Tunes can be plain TypeScript with no `eval` and no code strings.
- **The repl exposes what resume needs, but only to its caller.** Confirmed
  by running it: `initStrudel()` returns
  `{ scheduler, evaluate, start, stop, pause, setCps, setPattern, setCode,
  toggle, state }`, and `scheduler.now()` returns a cycle number that
  advances (0 → 1.206 over 2.5 s at cps 0.5). The plugin must **capture that
  return value** — `globalThis.repl` is a bare function, not the instance,
  and `StrudelPlayer` currently discards what `initStrudel()` hands back.
- ~~**A master gain node can be passed straight in.**~~ **Wrong — corrected
  during implementation.** `initStrudel` does forward `outputNode` to the repl
  constructor, but the repl passes it only to `this.audio = new yA(outputNode)`
  — the kabelsalat ugen path used by `.out()`. Ordinary `s()` / `note()` output
  goes through superdough's own chain (`channelMerger → destinationGain →
  destination`), which exposes no accessor, so there is no master node to ramp.
  The exported `setGain()` only sets a module-level scalar. **Pulsar ships no
  master fade**: entries are clean because every built-in tune has a non-zero
  attack, and `repl.stop()` halts scheduling while letting sounding notes
  finish their own release — a gentler exit than a ramped cut.
- **Only events with an onset fire.** `Cyclist` triggers a hap only when
  `hasOnset()` is true (`cyclist.mjs:63`). Resuming mid-cycle therefore drops
  any note already sounding rather than splicing it — which is why bookmarks
  round forward to a cycle boundary instead of restoring an exact position.
- **The resume chain checks out, verified by query rather than by ear.**
  `pattern.early(4)` queried over cycles 0–4 returns exactly what the
  unshifted pattern returns over cycles 4–8. A bookmark of `12.37` rounded up
  to 13 produces a first hap beginning at `0` — a clean downbeat — carrying
  the value the pattern has at cycle 13. Left unrounded, that same resume
  yields a first hap beginning at `-0.37` with `hasOnset() === false`, and a
  note spanning the resume point comes back as `onset=false` too: present in
  the query, never triggered. That is the dropped-note failure the rounding
  exists to avoid, reproduced.
- **`@strudel/repl` and `@strudel/web` do not share module instances.** The
  repl ships a prebundled 2.2 MB `dist/index.js` with its own core, mini,
  transpiler, webaudio and soundfonts. Two on one page means two schedulers,
  two `AudioContext`s, and two writers to the same `globalThis` names. This
  is why the lab left this repo for its own project (issue #26) — the site
  now carries no `@strudel/repl` at all, so the collision cannot recur here.
- **Default sound sources are third-party.** `samples("github:…")` resolves
  to `raw.githubusercontent.com`, and GM soundfonts fetch from
  `felixroos.github.io`. Acceptable for one opt-in lab page; not acceptable
  as a dependency on every page of every adopter's site.
- **Starlight has no header extension point.** Six overridable components,
  one override each, and three of them are already spoken for here. Pulsar
  claims none (issue #25).
- **Zod strips undeclared frontmatter**, and a Starlight plugin cannot extend
  a site's content schema. The site must merge in a fragment, the way it
  already merges `blogSchema()`.

## The model

Three reader states, stored as one value:

| Selection | Behaviour |
| --- | --- |
| `auto` (default) | play whatever the current page declares |
| `off` | play nothing, offer nothing |
| a tune name | play that tune on every page that permits music |

A page contributes one of three things: a declared tune, nothing at all (Auto
finds no tune here, but an explicit pick still plays), or `music: false` — a
silent page, which overrides the reader.

Because permission does not cross a page load, a selection only ever *arms*
the control. The reader's first click on a new page is what starts sound.
That click is also available inside the menu: choosing an entry is itself a
gesture, so selection and playback are one interaction, not two.

## Tunes

A tune is a module, not a string:

```ts
// tunes/boom-bap.ts
import { defineTune } from 'starlight-pulsar/tune'

export default defineTune({
  label: 'Boom Bap',
  cps: 88 / 60 / 4,
  gain: 0.9,          // levelled against the other tunes at authoring time
  pattern: () => stack(/* … */),
})
```

`cps` is separate from the pattern because the scheduler needs it before the
pattern is scheduled, and `gain` is separate because tunes must be levelled
against each other — switching from a pad to a kick pattern should not be a
volume event. There is no reader-facing volume control; the browser's
per-tab volume is the fallback, and Off is the last resort.

Built-in tunes are **synth-only**. No samples, no soundfonts, no network
beyond the engine itself, and no sample licensing for adopters to clear. A
site that wants richer sound registers custom tunes and serves the samples
from its own origin through the plugin's `samples` config.

## Storage

Two keys, both best-effort:

- `pulsar-selection` — `'auto' | 'off' | '<tune name>'`
- `pulsar-bookmarks` — `{ [tuneName]: cycle }`

A bookmark is written when a tune stops: on the reader's stop, and on
`pagehide` (not `beforeunload`, which disqualifies the page from bfcache).
On the next play the tune resumes at `Math.ceil(bookmark)` via `.early()`,
so it re-enters on a downbeat.

Position is measured as `offset + (audioContext.currentTime - startedAt) * cps`,
**not** from `scheduler.now()`. The spike read `now()` as a cycle clock
advancing at `cps`, and across a fresh start that holds — but after a
stop/start it does not: measured 0.147 cycles/s while `getCps()` read 0.06, so
a bookmark taken from it lands in the wrong place. Audio time times the tune's
own `cps` uses only values Pulsar sets, and is what the reader actually heard.
Verified in the browser: over 6.095 s of Drift at cps 0.06 the stored bookmark
was 0.3657 against an expected 0.3657 — exact — resuming at whole cycle 1.

Bookmarks are per tune, not global — switching between two tunes and back
picks each up where it was. Passing through a silent page does not clear
them, so opting a page out reads as a pause rather than a reset.

A ~20 ms gain ramp covers the start and stop of the `AudioContext`. It is not
what hides the seam — the cycle rounding is — but it keeps the entry clean.

## The control

One trigger plus one menu, modelled directly on Chameleon's skin selector
(`components/ThemeSelect.astro`): same listbox roles, same keyboard handling,
same `aria-selected` bookkeeping, same inline pre-hydration script to avoid a
flash of the wrong value.

Trigger states, which the icon should distinguish at a glance:

- **playing** — pulsing in time with the tune's `cps`
- **armed** — lit but still; one click resumes
- **nothing here** — the page declares no tune and the reader is on Auto
- **off** — the reader has opted out; the menu still opens

The control renders on every page, including pages with nothing to play. It
is never hidden — a control that appears and disappears as the reader moves
around the site is worse than one that is visibly idle.

## Plugin surface

```ts
starlightPulsar({
  tunes: ['drift', 'grid'],                       // built-ins by name
  // …or { name, label, module } for custom tunes
  samples: { base: '/audio/', map: { /* … */ } }, // optional, site-hosted
  control: 'manual',                              // or 'themeselect' to auto-claim
})
```

The plugin exports:

- a **schema fragment** the site merges into `docsSchema({ extend: … })`,
  contributing `music: z.union([z.string(), z.literal(false)]).optional()`
- a **control component** the site places itself
- a **virtual module** carrying the resolved tune list to that component,
  mirroring `virtual:starlight-theme-chameleon/config`

Pulsar claims no component slot by default. `control: 'themeselect'` is a
convenience for adopters running nothing else in the header: it takes the
slot when free and logs a clear message when not, rather than silently
disabling itself.

## Wiring on this site

- Merge the schema fragment in `src/content.config.ts` beside `blogSchema()`
  and `location`.
- Render the control in `src/components/SocialIcons.astro`, which the site
  already overrides. It lands in the header action row beside the skin picker
  and the language flags, and `src/styles/header.css` already scales that
  icon set.
- `music` is a mirrored fact: identical in a post's English and German files,
  by convention. No build check — a drifted value means a German reader hears
  a different tune, which breaks nothing, and enforcement should cost less
  than what it prevents.

## Phases

1. ~~**Spike the resume mechanics.**~~ **Done** — results are in the findings
   above. `scheduler.now()` → `Math.ceil` → `.early()` → `setPattern()` is
   sound, and the ramp attaches through `initStrudel({ outputNode })`. The
   `.early()` half needed no browser: patterns are queryable functions, so it
   ran in Node against `pattern.mjs` directly. (Not through `@strudel/core`'s
   entry point — its dist bundle imports browser-only `@kabelsalat/web`, and
   `@strudel/mini` re-imports that bundle, so mini-notation is unavailable in
   Node. `slowcat()` is what `<a b c>` desugars to anyway.)
2. ~~**Package skeleton**~~ **Done** — `index.ts` (plugin, i18n, virtual
   module), `lib/config.ts` (resolution, duplicate/unknown-tune guards),
   `schema.ts`, `tune.ts`, `virtual.d.ts`.
3. ~~**Control component**~~ **Done** — `components/TuneSelect.astro`.
   Transport and eject are separate buttons: the plan called for one click to
   resume an armed tune, which a menu-opening trigger cannot give. Playback
   state and selection are module-scoped, not per-element, because Starlight
   renders `SocialIcons` twice (header and mobile menu) and two controls on one
   page must not contradict each other.
6. **The deck** — added after the fact, on the Winamp analogy. The player lives
   *in the header*: scope, track name, transport row and eject in one strip, so
   a reader can see what is playing and stop it without opening anything. Eject
   opens the track list alone. All of it is `--sl-color-*`, so Chameleon skins
   flow straight through — the reason not to reach for Webamp, whose fidelity
   comes from rendering classic `.wsz` bitmap skins that could never track the
   site's theme.

   **Header budget is the hard constraint,** and the plugin owns only part of
   the answer. Pulsar itself sheds one thing: the scope, at 82rem, because it
   is the only decorative part. How a header spends the rest of its width is
   the host's decision, so the ladder below 64rem lives in the site's
   `src/styles/header.css`, not here — an adopter with a sparser header would
   want different widths entirely.

   The site's ladder, for reference: at 64rem the social links and language
   flags leave the header for the sidebar copy Starlight already renders
   (`.mobile-preferences`), which frees about 240px — more than the whole deck,
   so the deck itself does not degrade. Below Starlight's own 50rem the sidebar
   becomes the hamburger and carries everything, while the header keeps only
   play/pause and the light/dark toggle beside search and the menu button.

   Two notes on the mapping:

   - **Stop is Off**, and deliberately *not* Winamp's rewind-to-zero. Off is a
     preference meaning "stop offering"; bookmarks survive it exactly as they
     survive a silent page. Pressing play while Off lifts it, since that is an
     explicit request for sound.
   - **Selected and loaded are different rows.** On Auto the reader has chosen
     "whatever this page declares" while a specific tune is cued, so the
     playlist marks both.

   The scope is fed by routing the pattern through `.analyze('pulsar')` and
   reading `getAnalyzerData('time', 'pulsar')`. Drawing into Pulsar's own
   canvas rather than Strudel's `getDrawContext()` full-page one is what makes
   it fit the panel and take `getComputedStyle(canvas).color` as its stroke.
   Verified live: 566 lit pixels across 9 distinct rows while Grid played,
   against 1–2 rows for the flat baseline.
4. ~~**Site wiring**~~ **Done** — schema merged in `src/content.config.ts`,
   control placed in `src/components/SocialIcons.astro`, plugin registered in
   `astro.config.mjs`. Declared tunes: `drift` on both index pages, `grid` on
   both Pfeffer pages, `music: false` on `workarounds/index.md`.
5. ~~**Built-in synth-only tunes**~~ **Done** — `tunes/drift.ts` (ambient pad,
   cps 0.06) and `tunes/grid.ts` (96 bpm pulse). Verified: no off-origin
   requests during playback.

## Deferred

- Reader-facing volume (author-side levelling first; add only if missed).
- Continuity across navigation — unlocked for free if client-side routing
  ever lands for its own reasons.
- Publishing, and with it the license question. `@strudel/*` is
  AGPL-3.0-or-later and Chameleon is MIT; the package stays private with no
  `license` field until that is decided deliberately.
- A shared header tray, so plugins stop contending for slots (issue #25).
- The lab's move to a subdomain, and the "export as tune module" action that
  should come with it (issue #26).
