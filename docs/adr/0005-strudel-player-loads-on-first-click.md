# Strudel background music loads its engine on first click

The `StrudelPlayer` island imports `@strudel/web` inside its click handler
rather than at module scope, so a page embedding it ships zero Strudel
JavaScript until a reader presses play. Click-to-play is not a compromise but
the only possible design — browsers block audio before a user gesture — so
the player owns that identity instead of fighting it. The package is pinned
from npm rather than loaded from unpkg or iframed from strudel.cc, whose
share links depend on a database with no longevity guarantee. Strudel is
AGPL-3.0, so integrating it makes the site a derivative work; accepted
because the site source is public.
