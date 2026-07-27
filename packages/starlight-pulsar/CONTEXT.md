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
The header control: a Transport and an Eject button side by side, plus the
list Eject opens — Off, Auto, and the site's tunes. Choosing from that list is
itself the gesture that starts playback, so picking and playing are one
interaction.
_Avoid_: player, dropdown, music picker

**Transport**:
The play/pause half of the Tune selector, and the one click that starts an
Armed tune. Play/pause rather than play/stop because stopping writes a
Bookmark and the next play resumes from it — the tune is paused, not reset.
It shows pause only while sounding, and breathes in time with the tune's
`cps`.
_Avoid_: play button, toggle, speaker

**Eject**:
The half of the Tune selector that opens the tune list. Named for what the
button has meant since tape decks: not "stop", but "show me what else goes in
here". Separate from the Transport so resuming an Armed tune stays one click.
_Avoid_: caret, chevron, menu button

**Site author**:
The developer who installs Pulsar, writes or chooses its tunes, and decides
which pages carry which.
_Avoid_: plugin user, integrator

**Reader**:
A visitor of a Pulsar-equipped site. Overrides the page's choice or silences
the site entirely; the choice persists across visits, though playing never
does.
_Avoid_: listener, end user, visitor
