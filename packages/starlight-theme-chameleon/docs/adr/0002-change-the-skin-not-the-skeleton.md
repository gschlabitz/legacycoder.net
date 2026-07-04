# Change the skin, not the skeleton

A skin may change any CSS presentation — the full `--sl-` custom-property
surface plus its own scoped rules for typography, textures, radii, shadows —
but never markup, layout, or components. Correspondingly, Chameleon claims
exactly one Starlight component override slot, `ThemeSelect` (for the skin
picker), and never structural components like `Header` or `Sidebar`. This is
what keeps skins safe to switch at runtime and the plugin composable:
structural community themes (Galaxy, Rapide, Obsidian) derive their identity
from component overrides and are explicitly out of scope, while
`starlight-blog` and similar plugins keep working unchanged — the one shared
slot is resolved by the host site pointing starlight-blog's `navigation`
option away from `ThemeSelect`.

The doctrine has one reader-visible consequence: **icons keep their shapes.**
Starlight inlines its interface icons as raw SVG path data at build time
(`fill="currentColor"`), so skins can recolor and resize them but cannot swap
icon sets without touching the skeleton. Working around that (DOM swaps,
`mask-image` indirection) was considered and rejected as complexity that
undermines the rule that makes everything else simple. Icon customization is
out of scope.

The trade-off is deliberate: less dramatic theming in exchange for skins that
are safe to switch at runtime and a plugin that composes instead of forking
the ecosystem.
