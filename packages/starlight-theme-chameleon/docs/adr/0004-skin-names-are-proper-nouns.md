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
skin selector label, shipped inside Chameleon in ten locales.

Implementation keeps the skeleton doctrine intact: Chameleon renders the
selector inside its own `ThemeSelect` override (our one component slot). Both
visual variants share one custom listbox: `skinSelector: 'select'` presents a
Starlight-like select trigger showing the active skin's name, while
`skinSelector: 'icon'` collapses the trigger to a palette glyph. The popup uses
each skin's `[data-skin]` variables on its own option row so readers can
preview the look before applying it.

The glyph is a palette rather than a chameleon. A mascot names the plugin, not
the control, and readers meeting the button cold have no reason to connect a
lizard to appearance. A palette is the conventional "change how this looks"
sign, and the icon's job is to be understood, not to brand.

Trade-off accepted for `skinSelector: 'icon'`: the collapsed control shows the
palette glyph, not the active skin's name. The whole page *is* the feedback, and the popup
marks the current choice when opened. Sites that prefer visible state can use
the default `skinSelector: 'select'`.
