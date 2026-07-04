# The picker offers the host site's own look as "Default"

The skin picker always lists a "Default" entry first: the host site's
unskinned presentation — stock Starlight plus whatever custom CSS the site
already ships. It is the initial state for every reader, and choosing it
simply removes the `data-skin` attribute.

Sites have an identity before Chameleon arrives; a skin switcher that
silently replaced the site's own look on install would make trying the plugin
destructive instead of additive. The Default entry keeps installation
zero-risk (nothing changes until a reader picks a skin), gives readers an
always-available way back, and doubles as the no-JavaScript state: with
scripts disabled the attribute never appears and the site renders its own
look, fully usable.

Sites that want a skin as their identity use the other half of the exposure
control: `picker: false` pins the first configured skin site-wide and hides
the picker entirely. (Pinning relies on the same head script, so a no-JS
reader of a pinned site sees the Default look — a documented limitation.)

Rejected alternative: requiring site authors to register their existing look
as a custom skin to keep it reachable. That forces rescoping work on every
adopter for what is almost always the desired baseline behavior.

Consequence: built-in skins must look coherent next to an arbitrary host
default, and skin labels are reader-facing next to a translated "Default"
label (`starlightThemeChameleon.skinSelect.default`, EN/DE shipped).
