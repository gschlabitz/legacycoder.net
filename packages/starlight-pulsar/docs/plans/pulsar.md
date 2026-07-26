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
- **The repl exposes what resume needs, but only to its caller.**
  `initStrudel()` returns an object carrying `setPattern(pattern, autostart)`,
  `scheduler.now()` (a cycle number), `stop`, and `setCps`, so a pattern can
  be shifted and handed over directly without going through `evaluate`. The
  plugin must **capture that return value** — probing a running player showed
  `globalThis.repl` is a bare function, not the instance, and
  `StrudelPlayer` currently discards what `initStrudel()` hands back.
- **Only events with an onset fire.** `Cyclist` triggers a hap only when
  `hasOnset()` is true (`cyclist.mjs:63`). Resuming mid-cycle therefore drops
  any note already sounding rather than splicing it — which is why bookmarks
  round forward to a cycle boundary instead of restoring an exact position.
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

1. **Spike the resume mechanics** against the `StrudelPlayer` island before
   any packaging: confirm `scheduler.now()` → `Math.ceil` → `.early()` →
   `setPattern()` produces a clean downbeat re-entry, and find where a master
   gain node attaches for the ramp. Note that no page renders the island any
   more, so the spike needs a throwaway host page — which is the point of
   doing it first rather than discovering it inside a half-built plugin.
2. **Package skeleton** — config resolution, virtual module, schema
   fragment, no UI.
3. **Control component** — ported from Chameleon's selector, with the four
   trigger states.
4. **Site wiring** — schema, placement, and the first declared tunes on a
   handful of pages.
5. **Built-in synth-only tunes**, levelled against each other.

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
