# Code pairings and the `<Code>` component

A code pairing (a skin's mapping to a matching pair of syntax themes) makes
Expressive Code's `<Code>` component unusable site-wide unless the site adds a
root `ec.config.mjs`. This document records why that is, why the obvious
alternatives don't work, what Chameleon does about it, and what remains open.

> **Status:** implemented and verified against `@astrojs/starlight` 0.41.1 and
> the `astro-expressive-code` resolved by `astro` 7.0.9. The mechanism leans on
> two upstream implementation details (noted below) rather than on public API
> guarantees, so it deserves a re-read on the next Starlight or EC major.
>
> **Tracked in [#32](https://github.com/gschlabitz/legacycoder.net/issues/32)**
> — examine this fix in depth before relying on it long-term. The "Open
> questions" section at the end is that issue's checklist.

## The symptom

Adding a `<Code>` component to any page:

```astro
---
import { Code } from '@astrojs/starlight/components'
---
<p>before</p>
<Code code="const x = 1" lang="ts" />
<p>after</p>
```

…serves **HTTP 200 with a truncated body**. Everything up to the component
renders; the component and everything after it — including sibling markup much
further down, and the closing `</html>` — is simply absent. No error page, no
console error in the browser. Only the dev-server log names the cause:

```
Your Astro config file contains Expressive Code options that are not
serializable to JSON. To use the `<Code>` component, please create a separate
config file called `ec.config.mjs` in your project root, move your Expressive
Code options object into the config file, and export it as the default export.
```

The truncation is what makes this expensive to diagnose: the failure looks like
a layout or content bug, not a config error. `<Code>` throws *mid-render*, after
the response headers are already sent, so Astro has no way to swap in an error
page — it can only stop writing. Markdown and MDX code fences never touch this
path and are unaffected, which further misdirects the search.

## Root cause

Three facts compose into the failure. Each is deliberate upstream behavior.

**1. `themeCssSelector` is callback-only.** A code pairing needs each skin's
themes mapped onto `[data-skin][data-theme]`, which is what EC's
`themeCssSelector` option is for. Its type admits no serializable form:

```ts
themeCssSelector?: ((theme: ExpressiveCodeTheme, context: {
    styleVariants: StyleVariant[];
}) => string | false) | false | undefined;
```

So there is no string, object, or template form to fall back to — only a
function, or `false` to suppress theme rules entirely.

**2. Options forwarded through Starlight are serialized, and functions are
poisoned rather than dropped.** Starlight passes its `expressiveCode` config
straight into the EC integration as integration options. EC's Vite plugin
serializes those into a virtual module with `stableStringify`, which rewrites
every function to the string `"[Function]"` — it does not omit them the way
`JSON.stringify` would.

**3. `<Code>` rejects the poisoned marker.** The component builds its own
renderer and checks the serialized options for exactly that marker
(`astro-expressive-code/components/renderer.ts`), throwing the message above.
Markdown fences go through `rehype-expressive-code` with the live, unserialized
config object, which is why they keep working.

Together: **a callback can never reach `<Code>` through Starlight's
`expressiveCode` option.** This is not a bug to route around — it is the
serialization boundary working as designed.

## Why the alternatives don't work

- **A serializable `themeCssSelector`.** Doesn't exist; see fact 1.
- **Generate the per-skin CSS ourselves** (set `themeCssSelector: false`, which
  *is* serializable, and emit the rules directly). This means re-deriving EC's
  entire token-variable output for every theme — reimplementing EC internals and
  re-breaking on every EC release. Rejected as disproportionate.
- **Remap the default selectors in CSS.** Without an override, EC emits
  `[data-theme='<theme-name>']`. CSS cannot alias one selector to another, so
  the only way to reach `[data-skin][data-theme]` would be to duplicate every
  declaration — the previous option in worse clothing.
- **Have the plugin write `ec.config.mjs` itself.** A Starlight plugin has no
  business creating files in the user's project root, and would clobber a file
  the site may already own.
- **Have the plugin serve `ec.config.mjs` from a Vite virtual module.** EC's Vite
  plugin does resolve the file through the plugin container, so this is
  technically reachable for the `<Code>` path — but the *integration* path loads
  it with a real `import()` that Vite cannot intercept. The two paths would then
  disagree about the config, which is worse than failing.

## What Chameleon does

`ec.config.mjs` is EC's own sanctioned channel for non-serializable options, and
it is the only one that serves both paths. Two upstream details make it work:

- EC merges the config file **over** the integration options
  (`mergeEcConfigOptions(integrationOptions, ecConfigFileOptions)`) in both the
  integration and the `<Code>` path.
- Starlight's EC preprocessor — which runs in **both** paths, the component one
  via a stringified `preprocessComponentConfig` — spreads the incoming user
  options **last** (`...rest`) in its return object. So a `themeCssSelector`
  arriving from the config file overrides Starlight's own.

These are the two implementation details the mechanism depends on. Neither is a
documented guarantee.

So Chameleon splits the two halves of its EC configuration:

- [`lib/expressive-code.ts`](../lib/expressive-code.ts) —
  `composeExpressiveCodeConfig` returns the JSON-serializable options (`themes`,
  `useStarlightUiThemeColors`) *separately* from the `themeCssSelector`
  callback.
- [`index.ts`](../index.ts) forwards the callback through Starlight's config
  **only** when the site isn't handing that job to `ec.config.mjs`.
- [`lib/ec-config.ts`](../lib/ec-config.ts) is the adopter-facing helper for the
  file itself.

The adopter's side is one line:

```js
// ec.config.mjs
import { chameleonExpressiveCode } from 'starlight-theme-chameleon/ec-config'

export default chameleonExpressiveCode()
```

No skin list is needed. Chameleon defaults to every built-in skin, and the
callback is only ever asked about themes actually compiled into the build, so
entries for unregistered skins are never consulted — which means this file
cannot drift out of step with `astro.config.mjs`. Sites that pass `customSkins`,
or that override `expressiveCode.themes`, must repeat those here; a skin pairing
one of the site's own base themes otherwise loses the plain `[data-theme]`
mapping.

### Loading constraints

`ec.config.mjs` is loaded by **Node's own `import()`** during config setup, not
through Vite. Two rules therefore apply to everything reachable from
`lib/ec-config.ts`:

- **Relative imports need explicit `.ts` extensions.** Node's ESM resolver does
  no extension guessing. (Node does strip the types itself — the first attempt
  failed only on the extensionless import, not on the TypeScript.) Astro's base
  `tsconfig.json` already sets `allowImportingTsExtensions`, so TypeScript
  accepts them too.
- **No Astro, Starlight, or Node-only imports, and the TypeScript must stay
  type-strippable** — no `enum`, namespaces, or parameter properties — because
  Node erases types rather than compiling them.

This is why `lib/skins.ts` being import-free matters, and why the selector logic
lives in a module that pulls in nothing from Astro.

## The `ecConfigFile` option

The handover has three states, because auto-detection alone cannot tell a file
that carries Chameleon's options from one that exists for unrelated reasons.

| `ecConfigFile` | Behavior |
| --- | --- |
| `undefined` (default) | Auto-detect. Defers to the file when present; warns that `<Code>` is unusable when absent. |
| `true` | The file supplies the callback. **Fails the build** if it is missing, rather than silently dropping per-skin syntax themes. |
| `false` | Chameleon supplies the callback itself and stays silent. For sites that never import `<Code>`. |

### Diagnostics

Because every failure here is otherwise silent, each state that falls short says
so at startup:

- **No file, not opted out** — warns that `<Code>` is unusable and truncates
  pages, with the snippet to fix it, and mentions `ecConfigFile: false` to
  silence it.
- **`ecConfigFile: true`, no file** — hard error. Stepping aside with nothing to
  step aside *to* would drop per-skin syntax themes silently, so the
  contradiction is refused outright.
- **File present, no mention of `chameleonExpressiveCode`** — warns that code
  blocks will keep the base syntax themes instead of following the skin.
  Chameleon cannot see what EC merged, so this reads the file's source, the same
  heuristic `warnOnUnscopedSkinCss` already uses for custom skin CSS. A false
  negative is possible (the call may be re-exported from another module), which
  is why it warns rather than fails.

## Verified behavior

Reproduced and re-checked on legacycoder.net (3 skins, one code pairing each):

- **Before:** HTTP 200, 220,760 bytes, `</html>` absent, markup after the
  component gone.
- **After:** page complete. The EC stylesheet carries all six
  `[data-skin][data-theme]` selectors plus the base light/dark pair, and the
  `<Code>` block renders eight style variants. Computed token colors across
  skin × mode are six distinct values — nordic `#81A1C1`/`#076D89`, catppuccin
  `#CBA6F7`/`#8035E0`, home-computer `#A3FFA3`/`#0A4D0A`.
- **No regression:** with `ec.config.mjs` removed, the generated EC stylesheet is
  byte-identical to before the change; Markdown fences render the same eight
  variants from the same stylesheet.
- Clean `astro build` (429 pages) and `astro check` (0 errors).

## Open questions

Worth revisiting rather than treating as settled — tracked in
[#32](https://github.com/gschlabitz/legacycoder.net/issues/32):

- **Is the two-channel split still needed?** If EC ever accepts a serializable
  selector form (a mapping of theme name → selector would suffice for
  Chameleon's needs), the whole `ec.config.mjs` requirement disappears and this
  should be deleted, not maintained. Worth an upstream feature request.
- **Both upstream details are unguaranteed.** The config-file-wins merge order
  and Starlight's trailing `...rest` spread are implementation details. A test
  that asserts the composed selector actually reaches the rendered CSS would
  catch a silent regression; there is currently no such test.
- **Auto-detection still has one blind spot.** A file that supplies the callback
  indirectly (re-exported from another module) triggers a spurious warning, and
  one that only *looks* like it calls the helper passes the check. Reading the
  merged EC config instead of the file's text would be exact, if EC ever exposes
  it.
- **Should `ecConfigFile: true` become the documented default** for new adopters,
  so the failure is loud from the start rather than discovered via a truncated
  page? That would trade a one-line setup for a required one.
- **Node's type-stripping dependency.** Adopters on a Node without it would fail
  to load `ec.config.mjs`. Shipping the `ec-config` entry as plain `.mjs` with a
  `.d.mts` would remove that dependency, at the cost of the package no longer
  being TypeScript end to end.
