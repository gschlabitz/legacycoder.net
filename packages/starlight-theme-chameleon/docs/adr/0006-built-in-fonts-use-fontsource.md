# Built-in non-system fonts use Fontsource by default

Built-in Chameleon skins may use system stacks, but when a built-in skin
needs a non-system font as part of its identity, its default loading strategy
is `@fontsource`. Custom skin authors are not held to this preference: they
may use system stacks, `@fontsource`, hosted font CSS such as Google Fonts,
or vendored font files.

This splits two concerns. The built-in skins should be low-surprise package
citizens, so they should not silently add runtime requests to third-party
font hosts. They also should not vendor binary font files into Chameleon's
source tree unless there is a compelling reason. `@fontsource` keeps the font
asset in npm metadata, lets Astro/Vite resolve and hash the files into the
site build, and allows each skin to import only the subsets and weights it
actually uses.

The cost is install-time weight: a font package dependency is installed with
Chameleon even when a site author does not offer the skin that uses it. That
is acceptable because skin curation is already the opt-out mechanism for
runtime behavior, and browsers only download a webfont face when active CSS
references it. Documentation must be precise about that distinction:
`@fontsource` avoids third-party browser requests and source-tree vendoring;
it does not make the npm dependency disappear.

The policy is intentionally a default, not a rule for the ecosystem. Fonts
are presentation, and "change the skin, not the skeleton" includes
typography. A custom skin's author may reasonably choose hosted Google Fonts
for convenience, manual vendoring for a private typeface, or pure system
stacks for minimalism. Chameleon's invariant remains scoping under
`[data-skin]`, covering both light and dark mode, and preserving the
skeleton.
