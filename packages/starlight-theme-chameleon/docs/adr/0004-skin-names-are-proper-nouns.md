# Skin names are proper nouns

The skin selector lists skins by name, and those names — "Nordic", "Home
Computer" — are proper nouns, shown identically in every language. A skin is a
designed artifact with a title, like a font or a color scheme ("Nord",
"Dracula", "Catppuccin" don't translate either); treating labels as
translatable UI copy was solving a problem skins don't have.

This kills the plugin's localization surface. Skin authors provide one
string (`label: 'Nordic'`), not a record per language, and adding a locale to
a site never requires touching skin config. Even the first entry — the host
site's unskinned look — is a proper noun: it's named "Starlight", after what
that look actually is (ADR 0003). The single translatable string left is the
skin selector label, shipped inside Chameleon (EN/DE).

Implementation keeps the skeleton doctrine intact: Chameleon renders the
selector inside its own `ThemeSelect` override (our one component slot). Both
visual variants share one custom listbox: `skinSelector: 'select'` presents a
Starlight-like select trigger, while `skinSelector: 'icon'` presents only the
glyph. The popup uses each skin's `[data-skin]` variables on its own option row
so readers can preview the look before applying it.

Trade-off accepted for `skinSelector: 'icon'`: the collapsed control does not
show the active skin's name. The whole page *is* the feedback, and the popup
marks the current choice when opened. Sites that prefer visible state can use
the default `skinSelector: 'select'`.
