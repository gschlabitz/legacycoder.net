# Strudel ships as two islands: a heavy REPL for the lab, a deferred player for background music

Strudel (the JavaScript TidalCycles port) enters the site in two weight
classes that never share a page's default load. The lab page
(`src/content/docs/strudel.mdx`, a docs page like Pfeffer's) embeds the full
live-coding environment via `@strudel/repl`'s `<strudel-editor>` web
component, wrapped in the `StrudelRepl` island; the package (CodeMirror,
tonal, soundfonts) is dynamically imported inside the island, so Vite
code-splits it and it only ever downloads on `/strudel`. Future background
music on content pages uses the `StrudelPlayer` island instead: a play/stop
toggle over `@strudel/web` (pattern core + WebAudio, no editor) whose engine
is imported inside the click handler, so embedding pages ship zero Strudel JS
until a reader presses play. Click-to-play is not a compromise but the only
possible design — browsers block audio before a user gesture — so the player
owns that identity rather than fighting it. Both packages are installed from
npm and pinned in the lockfile instead of loaded from unpkg or embedded as
iframes of strudel.cc: the site already builds with Vite, and strudel.cc's
share links depend on a database with no longevity guarantee. Strudel is
AGPL-3.0; integrating it makes the site a derivative work, accepted because
the site source is public on GitHub. Sounds stream from the default
dirt-samples repo at play time, so playback needs a network connection even
though the code is fully bundled.
