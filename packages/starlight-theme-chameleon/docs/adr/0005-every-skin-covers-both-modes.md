# Every skin covers both modes

A Chameleon skin must support both light and dark mode. There are no
mode-locked skins: built-ins ship with both faces designed, and custom skin
authors are held to the same bar. That bar *is* the curation — "covers both
modes" sits alongside "scopes under `[data-skin]`" as what makes a skin a
skin.

Single-mode skins (`mode: 'light' | 'dark'`) were prototyped and removed
before release, because the dual-mode requirement is simpler at every layer:

- **For readers**: the mode switch is always present and always works — no
  control that hides and reappears as skins change — and
  `prefers-color-scheme` (a comfort and accessibility need, not a theme
  choice) is honored under every skin, not just some.
- **For skin authors**: the prototype's CSS-only lock (never scripting
  `data-theme`, which fights Starlight's ThemeProvider — the skin instead
  had to look identical under both `data-theme` values) demanded the
  plugin's subtlest authoring rules: `color-scheme` pins, derived-variable
  pins, a `--sl-color-gray-7` pin, all failing silently when missed. The
  dual-mode rules are just "define your palette twice."
- **For the plugin**: no `mode` field, no single-slot code pairings, no
  config-generated CSS hiding the mode select, no order-dependent Expressive
  Code selector tiebreak.

The cost is that single-mode concepts must design a second face. Experience
says that constraint is generative rather than limiting: the Home Computer
skin's light mode — the hardcopy that came out of the phosphor terminal's
printer — is a better skin for having been forced into existence, and
briefly lived as a separate mode-locked skin before this decision folded it
back in.

Chameleon cannot verify visual mode coverage mechanically, so the
requirement is doctrine plus documentation (the authoring guide's
"define colors twice" rule and its light-block checklist), not a build
error.
