# Skins are build-time scoped CSS, switched by a data attribute

Starlight community themes cannot be offered in a runtime picker: each one is
a build-time plugin that injects unscoped CSS on every page, and many also
override components (Galaxy replaces `Header` and `ThemeSelect`, Rapide
replaces `ThemeSelect`, `Pagination`, and `LanguageSelect`) — markup that is
baked into the HTML and unswitchable from the client. Chameleon therefore
compiles every offered skin into the site at build time, scoped under
`[data-skin='<name>']`, and switching only flips that attribute (persisted in
`localStorage`, applied by an inline head script before first paint, mirroring
Starlight's own light/dark provider).

The scoping works because Starlight routes its whole appearance through
`--sl-`-prefixed custom properties — colors, `--sl-font`/`--sl-font-mono`, the
`--sl-text-*` type scale — so a skin is that surface redefined under its
attribute, plus any presentation CSS of its own. The known exception is syntax
highlighting, which Expressive Code compiles at build time keyed to light/dark
only; per-skin code theming goes through EC's `themeCssSelector` mapping
instead (see the plan's code-pairing spike).

Rejected alternatives: installing community theme plugins side by side (their
stylesheets cascade-fight over the same `--sl-*` variables; last one wins), and
lazy-loading skin CSS on selection (flash of unstyled skin, caching
complexity, no real payload win — and webfonts already lazy-load by
themselves, since browsers only fetch fonts referenced by active rules).

Consequences: every offered skin's CSS ships to every reader, so the curated
list should stay small; and community themes must be vendored and rescoped as
skin ingredients rather than installed as their npm plugin packages.
