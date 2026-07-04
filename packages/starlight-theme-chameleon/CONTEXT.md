# Chameleon

A Starlight plugin that gives a site switchable skins — coordinated colors,
typography, and surface feel — curated by the site author and, when exposed,
selectable by readers. Motto: change the skin, not the skeleton. Developed
in this repo as a workspace package; legacycoder.net is its first adopter.

## Language

**Skin**:
A named restyling of the whole site — colors, typography, surface feel — that
changes presentation only. Each skin covers both light and dark mode.
_Avoid_: theme, palette, style pack

**Skeleton**:
Everything a skin may never touch: the site's markup, layout, and components.
The fixed half of the motto.
_Avoid_: structure, template, layout

**Mode**:
Starlight's built-in light/dark/auto axis. Orthogonal to skins: a reader
combines any skin with any mode.
_Avoid_: theme, dark mode setting

**Built-in skin**:
A skin that ships with Chameleon, offered by name in the plugin configuration.
_Avoid_: default skin, bundled theme

**Custom skin**:
A skin the site author (or any skin author) supplies as their own CSS file and
registers alongside the built-in ones.
_Avoid_: user theme, override skin

**Skin picker**:
The header control readers use to choose a skin, present only when the site
author exposes it. Chameleon's replacement for the slot Starlight's theme
select occupies; mode switching stays available within it.
_Avoid_: theme selector, dropdown

**Default look**:
The host site's own unskinned presentation — stock Starlight plus the site's
custom CSS. Always the picker's first entry and every reader's initial state;
also what no-JavaScript readers get.
_Avoid_: base theme, fallback skin, no-skin mode

**Pinned skin**:
A skin the site author applies site-wide without offering the picker — every
reader sees it, none can change it.
_Avoid_: locked skin, forced theme

**Skin author**:
Whoever designs a skin — Chameleon's maintainer for built-ins, the site author
or a third party for custom skins.
_Avoid_: theme author, designer

**Site author**:
The developer who installs and configures Chameleon — decides which skins the
site carries and whether readers may switch.
_Avoid_: plugin user, integrator

**Reader**:
A visitor of a Chameleon-equipped site. Picks a skin when the picker is
exposed; the choice persists across visits.
_Avoid_: end user, visitor

**Code pairing**:
A skin's mapping to a matching pair of syntax-highlighting themes (one per
mode), compiled into the build and switched with the skin, so code blocks
change alongside the rest of the site. Optional per skin; without one, code
blocks keep the site's base syntax themes.
_Avoid_: EC integration, syntax theme switching
