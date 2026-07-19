# Legacy Coder

Guido's personal site (legacycoder.net): a bio, a work/life timeline, learning
notes, and family ephemera, built as an Astro + Starlight docs site.

## Language

### Site & pages

**Docs page**:
A content page under Starlight's docs collection, auto-routed and listed in the
sidebar.
_Avoid_: article, post

**Custom page**:
A standalone route (like `/bio`) that keeps the Starlight shell and theme but
owns its full markup instead of being a docs page.
_Avoid_: standalone page, raw page

**Island**:
An interactive React component hydrated in the browser. Anything that doesn't
need interactivity is a static Astro component instead — the split is
deliberate.
_Avoid_: widget, dynamic component

**LLM Notebook**:
The docs section holding working notes from learning how LLMs work.
_Avoid_: blog, AI notes

### Localization

**Locale**:
One of the site's two languages: `root` (English, unprefixed URLs like `/`,
`/blog/...`, `/pfeffer`) or `de` (German, under `/de/...`). English is the
default locale; adding German never moves or renames English content.
_Avoid_: language, translation

**Mirrored frontmatter**:
The rule for locale counterpart files: facts are mirrored, words are
localized. Data frontmatter (tags, location, date) is locale-independent and
must stay identical across a post's locale files; prose frontmatter (title,
description, excerpt) belongs to its locale and is never machine-copied
across.
_Avoid_: synced frontmatter, translated frontmatter

**Fallback page**:
A German-URL page (`/de/...`) that has no German translation yet, so
Starlight renders the English content with its "untranslated" notice and
German UI chrome. Resolves itself once the corresponding German file is
added.
_Avoid_: untranslated page, missing translation

### Blog

**Blog post**:
A dated story in the site's archive, rendered via the `starlight-blog` plugin
under `/blog` (English) and `/de/blog` (German). The blog is the full archive
and retroactive auto-biography: it starts with Guido's birth (August 29, 1972)
and continues to the present day. Timeline events are blog posts — the bio
timeline is a lens on this archive, not a separate body of content.
_Avoid_: article, entry

**Date precision**:
The frontmatter `date` is the source of truth for everything derived (sort
order, displayed date, timeline position, camera track order) and may be
corrected whenever better information surfaces — it's a fact, so mirror it
across locales. The filename sets the URL and encodes only the precision
actually known: a post dated to the month is named `YYYY-MM-slug` and carries
day `01` in frontmatter as a "sometime that month" convention. Date edits are
frontmatter-only; filenames are forever.
_Avoid_: fake dates, approximate dates

**Draft**:
A Blog post with `draft: true` — visible in dev, absent from the production
build, identically for the blog and the timeline (the lens never shows more
or less than the archive). A draft may omit its location so writing stays
zero-ceremony; the dev timeline skips unlocated drafts with a warning, and
removing the draft flag is the moment full location enforcement kicks in.
Tags are vocabulary-checked even on drafts.
_Avoid_: unpublished post, WIP post

**Tag**:
A subject label on a Blog post, drawn from the site's closed vocabulary
(`career`, `skills`, `family`, `travel`, `hobby`). Tags are the timeline's
filter dimensions, derive the Sphere (`career` → work), and pick the Tag pin
icon (first tag decides). The vocabulary grows only by deliberately adding a
value — a build-time check rejects anything outside the list, because a
misspelled `career` would silently file a work post under life. Tagging is a
deliberate editorial act: untagged posts are legitimate (they read as life
sphere, wear the plain teardrop pin, and simply don't appear under any tag
filter) — tags are never blanket-stamped just to make everything filterable.
_Avoid_: label, category, free-form tags

**Schlabitz News era**:
The 2005–2009 stretch of the archive, migrated one-time from Blogspot to get
the content out of Google's hands: originally one bilingual page per post,
later split per locale under the same filename — bodies and titles alike —
wording preserved exactly as written (a re-arrangement, never a
retranslation). Images rehosted locally,
dead video embeds replaced with a note. Comments were not migrated.
_Avoid_: the blog (it is one era of the blog, not the blog)

### Theming

**Chameleon**:
The skin-switching Starlight plugin developed in this repo as a workspace
package (`packages/starlight-theme-chameleon`) and layered on top of
starlight-blog; the site is its first adopter. It has its own context — see
[CONTEXT-MAP.md](./CONTEXT-MAP.md).
_Avoid_: theme plugin, theme selector, palette plugin

### Bio timeline

**Timeline event**:
A Blog post seen through the bio timeline's lens. Every post in the archive
is a timeline event — the timeline is not a separate body of content, and a
post cannot opt out. Readers narrow the timeline by tags, never by a
membership flag. The timeline shows each event's most deliberate summary
(its excerpt, else its description, else the whole body), and the event's
title always links to the post — the lens points into the archive.
_Avoid_: milestone, entry, item

**Sphere**:
The half of the split timeline an event belongs to — `work` or `life`,
mirroring the work/life-balance metaphor. Derived from tags, never stored:
a post tagged `career` is work; every other post is life. A `life` tag is
implied and never written in frontmatter.
_Avoid_: category, side, column

**Timeline map**:
The map banner on the bio page that shows where timeline events happened.
_Avoid_: location map, minimap

**Tag pin**:
The pin marking an event by its first tag — the same shape and size on the
timeline rail (where every event has one in place of a dot) and as the
timeline map's markers. Everything renders in one color, the rail's gray
(`PIN_COLOR`), so the tag identity is the icon, not a hue. Tags with a
monochrome stroke icon (see `TAG_ICONS`) render as the icon in a large thin
ring: on the map with a stem down to the exact coordinate, on the rail as
the bare ring sitting on the line like a node; tags without one keep the
plain punched-hole teardrop. Pins are also the cross-navigation: clicking a
rail pin centers the map on the event's place, clicking a map pin scrolls the
timeline to its event, cycling through them when the place hosts several.
_Avoid_: dot, marker icon, custom marker

**Pin reveal**:
A pin dropping onto the timeline map once the reader has reached or passed its
event — or clicked the event's rail pin. Revealed pins persist for the rest of
the visit, even when the camera has moved elsewhere.
_Avoid_: marker animation

**Camera track**:
The piecewise line through the event pins, in on-screen order, that the
timeline map's center travels along — geared linearly to scroll, never
changing zoom (the camera opens at city scale; zoom belongs to the reader).
Track movement never adds or removes pins. Every published timeline event
must have coordinates so the track has no holes — a build-time check enforces
it (posts live in the shared docs collection, so the schema can't); Drafts
are exempt until published. The default stamp for a post is home-at-the-time;
trips carry their real coordinates.
_Avoid_: focus, camera path, auto-framing

**Centered event**:
The timeline event whose article midpoint sits nearest the midpoint of the
band left visible above the timeline map. The camera stands exactly on its
pin, gliding toward a neighbor's pin as the scroll moves between midpoints.
_Avoid_: focused event, current event, active event

### Image attribution

**Credit**:
The TASL attribution record (Title, Author, Source, License) for a reused
image, stored as a JSON sidecar next to the image file.
_Avoid_: attribution, caption metadata

**Figure**:
An image rendered together with its credit as a caption. Any
Creative-Commons/attributed image on the site must be a Figure.
_Avoid_: captioned image

### Pfeffer

**Pfeffer**:
The family's Farkle-style dice game (and its page). Also the in-game call:
betting at the start of your turn that you'll outscore your predecessor's round
by at least 50 points.
_Avoid_: Farkle

### Strudel

**Strudel lab**:
The docs page (`/strudel`) holding the full Strudel live-coding REPL for
experimenting with music as code. The heavy editor island is confined to this
page (ADR-0005).
_Avoid_: playground, sandbox

**Player island**:
The click-to-play toggle (`StrudelPlayer.jsx`) that puts a fixed Strudel
pattern behind any content page as background music. It downloads its engine
on first click, never with the page, and never autoplays — browsers require
the gesture anyway.
_Avoid_: autoplay, embed
