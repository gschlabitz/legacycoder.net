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
A pin dropping onto the timeline map when the reader scrolls its event into
view; the map's viewport fits only the pins revealed so far.
_Avoid_: marker animation

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
