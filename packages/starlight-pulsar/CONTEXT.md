# Pulsar

A Starlight plugin that gives each page its own background music: Strudel
patterns curated by the site author, declared per page, and started by the
reader. Motto: the page sets the tune, the reader has the last word.
Developed in this repo as a workspace package; legacycoder.net is its first
adopter.

## Language

**Tune**:
A named piece of music the plugin can play — a label, a tempo, a level, and
the pattern itself. Tunes are the only thing that ever sounds; nothing plays
that isn't one.
_Avoid_: track, song, loop, BGM, pattern (a pattern is what a tune contains)

**Built-in tune**:
A tune that ships with Pulsar. Built-ins are synth-only, so installing the
plugin never adds a network fetch or a sample license to a site.
_Avoid_: default tune, bundled track

**Custom tune**:
A tune the site author writes and registers alongside the built-in ones. Free
to use self-hosted samples the site serves itself.
_Avoid_: user tune, local track

**Declared tune**:
The tune a page names for itself. What a page sounds like is an editorial
choice, made where the rest of the page's facts are made.
_Avoid_: page default, assigned tune

**Silent page**:
A page that refuses music outright, overriding whatever the reader chose.
Distinct from a page that simply declares no tune — that one still plays a
reader's explicit pick.
_Avoid_: muted page, excluded page

**Auto**:
The reader's choice to defer to whatever each page declares. Every reader
starts here.
_Avoid_: default, page mode, follow mode

**Off**:
The reader's choice that nothing plays and nothing is offered. Not a volume
of zero — nothing is scheduled at all.
_Avoid_: mute, silence, pause

**Armed**:
Selected but not sounding, waiting for a gesture this page has not had yet.
Browsers refuse audio until the reader acts, and that permission does not
survive a page load, so a reader who chose a tune arrives at every new page
armed rather than playing.
_Avoid_: paused (a reader stops a tune; only the browser arms one), stopped,
pending

**Bookmark**:
Where a tune was when it last stopped, kept per tune and picked up on the
next play. Resuming rounds forward to a whole cycle, so a tune always
re-enters on its own downbeat.
_Avoid_: position, offset, timestamp, seek point

**Tune selector**:
Everything the reader touches: the Deck in the header, and the Track list that
Eject opens.
_Avoid_: dropdown, music picker

**Deck**:
The player itself, living in the site header: Scope, Readout, the transport
row, and Eject, in one bordered strip. It is in the header rather than behind
a menu so a reader can see what is playing and stop it without opening
anything. Styled entirely from Starlight's own custom properties, so it wears
whatever skin the site has active — the reason it is built here rather than
borrowed from Webamp, which renders bitmap skins of its own.
_Avoid_: player, widget, bar

**Windowshade**:
What the Deck becomes when the header runs out of room: chrome off, and
everything but Transport and Eject moved into the Track list. Named after
Winamp's collapsed mode. Controls relocate, never disappear — Starlight's own
mobile menu does not take over until 50rem, and a gap between the two would
leave a reader no way to stop the music.
_Avoid_: compact mode, mobile mode

**Track list**:
The panel Eject opens: Auto and the site's tunes, plus whatever the
Windowshade has pushed down from the Deck. The selected row is the reader's
choice; the loaded row is what is actually cued — on Auto those differ, and
both are marked.
_Avoid_: playlist (that is the per-page idea, not yet built), menu, dropdown

**Transport**:
The Deck's play/pause button, and the one click that starts an Armed tune.
Play/pause rather than play/stop because stopping writes a Bookmark and the
next play resumes from it — the tune is paused, not reset. It shows pause only
while sounding, and breathes in time with the tune's `cps`.
_Avoid_: play button, toggle, speaker

**Eject**:
The Deck's button that opens the Track list. Named for what the button has
meant since tape decks: not "stop", but "show me what else goes in here".
Separate from the Transport so resuming an Armed tune stays one click.
_Avoid_: caret, chevron, menu button

**Stop**:
The transport button that turns the site quiet — it sets the reader to Off.
Deliberately not a rewind: Bookmarks survive it, the same way they survive a
Silent page, because Off means "stop offering" rather than "start over".
_Avoid_: mute, reset

**Readout**:
The Deck's track name. Its tempo — `cps` and seconds per cycle — rides along
as a tooltip rather than more header pixels. The place a hardware deck would
put a track name and its bitrate, showing numbers actually true of the tune.
_Avoid_: display, LCD, status bar

**Scope**:
The Deck's oscilloscope, drawn from a named Strudel analyser the pattern is
routed through. It draws into Pulsar's own canvas rather than Strudel's
full-page one, so it fits the header and takes its colour from the active
skin, and normalises to the buffer's own peak — background music is quiet by
design, and a fixed scale in a twenty-pixel canvas draws something
indistinguishable from silence. Flat and still when nothing is sounding.
_Avoid_: visualizer, spectrum, waveform

**Site author**:
The developer who installs Pulsar, writes or chooses its tunes, and decides
which pages carry which.
_Avoid_: plugin user, integrator

**Reader**:
A visitor of a Pulsar-equipped site. Overrides the page's choice or silences
the site entirely; the choice persists across visits, though playing never
does.
_Avoid_: listener, end user, visitor
