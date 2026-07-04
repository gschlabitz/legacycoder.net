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

**Fallback page**:
A German-URL page (`/de/...`) that has no German translation yet, so
Starlight renders the English content with its "untranslated" notice and
German UI chrome. Resolves itself once the corresponding German file is
added.
_Avoid_: untranslated page, missing translation

### Blog

**Blog post**:
A migrated Schlabitz News entry (2005–2009), rendered via the `starlight-blog`
plugin under `/blog` (English) and `/de/blog` (German). Originally migrated
from Blogspot as one bilingual page per post; later split per language, one
file per locale under the same filename, wording preserved exactly as
written (a re-arrangement, never a retranslation). Images rehosted locally,
dead video embeds replaced with a note. Comments were not migrated.
_Avoid_: article, entry

### Theming

**Chameleon**:
The skin-switching Starlight plugin developed in this repo as a workspace
package (`packages/starlight-theme-chameleon`) and layered on top of
starlight-blog; the site is its first adopter. It has its own context — see
[CONTEXT-MAP.md](./CONTEXT-MAP.md).
_Avoid_: theme plugin, theme selector, palette plugin

### Bio timeline

**Timeline event**:
A dated moment in Guido's history, one file per event, shown on the bio
timeline.
_Avoid_: milestone, entry, item

**Sphere**:
The half of the split timeline an event belongs to — `work` or `life`,
mirroring the work/life-balance metaphor. Set explicitly per event; tags never
determine it.
_Avoid_: category, side, column

**Timeline map**:
The map banner on the bio page that shows where timeline events happened.
_Avoid_: location map, minimap

**Pin reveal**:
A pin dropping onto the timeline map once the reader has reached or passed its
event. Revealed pins persist for the rest of the visit, even when the camera
has moved elsewhere.
_Avoid_: marker animation

**Focus**:
The located timeline events currently on screen. The timeline map's camera
frames the focused events' places — tight on one place, widening while events
from two places share the screen — and holds its last framing while the focus
is empty (before the first located event, it frames the journey's first
place). Focus moves the camera only; it never adds or removes pins.
_Avoid_: visible events, active pins

**Full story link**:
The "Read the full story →" link shown under a timeline event that has a
migrated Blog post behind it, set via the event's optional `post` frontmatter
field. Most events don't have one.
_Avoid_: post link, read more link

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
