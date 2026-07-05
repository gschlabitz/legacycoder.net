# Skin names are proper nouns; the picker is an icon

The skin picker renders as a chameleon icon, not a labeled select. Clicking
it opens the list of skins by name, and those names — "Nordic",
"Home Computer" — are
proper nouns, shown identically in every language. A skin is a designed
artifact with a title, like a font or a color scheme ("Nord", "Dracula",
"Catppuccin" don't translate either); treating labels as translatable UI copy
was solving a problem skins don't have.

This kills the plugin's localization surface. Skin authors provide one
string (`label: 'Nordic'`), not a record per language, and adding a locale to
a site never requires touching skin config. Even the first entry — the host
site's unskinned look — is a proper noun: it's named "Starlight", after what
that look actually is (ADR 0003). The single translatable string left is the
picker's screen-reader label, shipped inside Chameleon (EN/DE).

Implementation keeps the skeleton doctrine intact: the icon is an inline SVG
in Chameleon's own `ThemeSelect` override (our one component slot), and the
"popup" is a native `<select>` stretched invisibly over the icon — native
option list, keyboard support, and screen-reader semantics for free, with no
custom menu code to maintain.

Trade-off accepted: the collapsed control no longer shows the active skin's
name. The whole page *is* the feedback, and the native list marks the current
choice when opened.
