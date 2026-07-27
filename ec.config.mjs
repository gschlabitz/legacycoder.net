// Expressive Code options that cannot travel through Starlight's config.
//
// Chameleon maps each skin's syntax themes to `[data-skin][data-theme]` via
// EC's `themeCssSelector`, which EC accepts only as a callback. Starlight
// serializes the options it forwards to the EC integration, so a callback sent
// that way reaches EC's `<Code>` component as `"[Function]"` and makes it throw
// mid-render — truncating the page with no error shown. This file is EC's
// supported channel for such options, and is merged over the integration
// options in both the Markdown and `<Code>` paths.
//
// No skin list needed: Chameleon defaults to every built-in skin, and
// selectors for skins the site does not register are never consulted. That
// keeps this file from drifting out of step with `astro.config.mjs`.
import { chameleonExpressiveCode } from "starlight-theme-chameleon/ec-config";

export default chameleonExpressiveCode();
