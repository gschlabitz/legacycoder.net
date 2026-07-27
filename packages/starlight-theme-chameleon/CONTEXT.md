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
combines any skin with any mode, and every skin is required to cover both —
that requirement is part of the curation (ADR 0005).
_Avoid_: theme, dark mode setting

**Built-in skin**:
A skin that ships with Chameleon, offered by name in the plugin configuration.
_Avoid_: default skin, bundled theme

**Custom skin**:
A skin the site author (or any skin author) supplies as their own CSS file and
registers alongside the built-in ones.
_Avoid_: user theme, override skin

**Skin selector**:
The header control that opens the list of skins by name, present only when
the site author exposes it. Chameleon's replacement for the slot Starlight's
theme select occupies; Starlight's theme selector renders alongside it. Skin
names are proper nouns and are never translated.
_Avoid_: theme selector, dropdown, skin picker

**Starlight look**:
The host site's own unskinned presentation — stock Starlight plus the site's
custom CSS. Always the skin selector's first entry (labeled "Starlight", a proper
noun like every skin name) and every reader's initial state; also what
no-JavaScript readers get.
_Avoid_: default look, base theme, fallback skin, no-skin mode

**Pinned skin**:
A skin the site author applies site-wide without offering the skin selector — every
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
A visitor of a Chameleon-equipped site. Picks a skin when the skin selector is
exposed; the choice persists across visits.
_Avoid_: end user, visitor

**Code pairing**:
A skin's mapping to a matching pair of syntax-highlighting themes (one per
mode), compiled into the build and switched with the skin, so code blocks
change alongside the rest of the site. Optional per skin; without one, code
blocks keep the site's base syntax themes.
_Avoid_: EC integration, syntax theme switching

## Constraints

### Code pairings and the `<Code>` component

A code pairing needs Expressive Code's `themeCssSelector` option to map each
skin's themes onto `[data-skin][data-theme]`. EC accepts that option only as a
**callback** — `((theme, context) => string | false) | false`, no serializable
form — and the options Starlight forwards to the EC integration are serialized
into a virtual module with `stableStringify`, which rewrites functions to the
string `"[Function]"`. EC's `<Code>` component checks for that marker and
throws.

The failure mode is what makes this worth writing down: the throw happens
*while rendering*, after the response headers are sent, so the HTML stream is
truncated at the component. No error page — the page just stops, everything
after the `<Code>` disappears, and only the dev-server log names the cause.
Markdown and MDX code fences never go through this path and are unaffected.

The callback's one channel that reaches both paths is a root `ec.config.mjs`.
Chameleon therefore splits the two halves — `composeExpressiveCodeConfig`
returns the serializable options separately from the callback — and forwards
the callback through Starlight's config only when the site isn't handing that
job to `ec.config.mjs`. `lib/ec-config.ts` is the adopter-facing helper for
that file; the `ecConfigFile` option controls the handover.

Two rules follow for everything reachable from `lib/ec-config.ts`, because
`ec.config.mjs` is loaded by Node's own `import()` during config setup rather
than through Vite:

- Relative imports carry explicit `.ts` extensions — Node's ESM resolver does
  no extension guessing. Astro's base `tsconfig.json` already sets
  `allowImportingTsExtensions`, so TypeScript accepts them too.
- No Astro, Starlight, or Node-only imports, and the TypeScript must stay
  type-strippable (no `enum`, namespaces, or parameter properties), because
  Node erases types rather than compiling them.

**Full reasoning, alternatives rejected, verification evidence, and open
questions: [docs/expressive-code.md](./docs/expressive-code.md).** The mechanism
depends on two *undocumented* upstream details (EC merging the config file over
the integration options; Starlight's preprocessor spreading user options last),
so re-read it on the next Starlight or EC major — tracked in
[#32](https://github.com/gschlabitz/legacycoder.net/issues/32). Verified against
`@astrojs/starlight` 0.41.1 and `astro-expressive-code` as resolved by
`astro` 7.0.9.
