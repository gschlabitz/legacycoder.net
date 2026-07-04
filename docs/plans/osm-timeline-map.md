# Replace the Google timeline map with an OSM-based map

Status: parked — Google Maps stays for now to see how it plays in daily use.
Pick this up as part of the de-google-ing effort. Written 2026-07-04, right
after the camera-track rework; if TimelineMap.jsx has changed shape since,
re-scout before executing.

## Context

The bio timeline map ([src/components/TimelineMap.jsx](../../src/components/TimelineMap.jsx))
renders Google Maps. After the camera-track rework, every Google-specific
dependency is contained in that one file — the camera model (scroll-geared
`setCenter` along the track, one zoom level, custom pin-SVG markers) maps
almost 1:1 onto open tooling. `bio.astro` and the `places` prop are
map-vendor-agnostic already, and `npm run geocode` is already OSM
(Nominatim).

What the swap buys: no API key, no billing account, no referrer lockdown, no
Google script on the page, dev = prod (the keyless placeholder banner can be
deleted), and cheaper theming. What it costs: Street View (see Losses).

## Decisions (settle before starting)

1. **Renderer: MapLibre GL JS** (not Leaflet). Vector tiles, WebGL,
   npm-installable. Built-in `cooperativeGestures: true` reproduces the
   plain-wheel-scrolls-the-page behavior; custom HTML markers take the
   existing pin SVGs directly; dark mode is a `map.setStyle()` call on the
   live instance.
2. **Tiles — pick one:**
   - **OpenFreeMap** (https://openfreemap.org): hosted vector tiles, free,
     no API key. Least effort; recommended starting point.
   - **Protomaps** (https://protomaps.com): one self-hosted `.pmtiles` file
     on our own static hosting. Zero third parties — the maximalist
     de-google option. More setup (tile extract, style JSON).
   - MapTiler/Stadia free tiers work but need a key — that defeats half the
     point.
3. **Street View replacement:** none exists in OSM. Options, pick one:
   - Drop it (simplest; decide after living with Google for a while whether
     anyone actually uses the pegman).
   - Per-place "Open in Google Street View" external link (a plain URL, no
     API/key/script): `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}`
     — could hang off the marker or the placeholder chip row.
   - Mapillary embed — rejected: coverage in rural southern Illinois (most
     pins) is thin to nonexistent.

## Implementation

All in `TimelineMap.jsx` unless noted. `places`, the camera-track math, the
reveal spy, and all of `bio.astro` are untouched.

1. `npm install maplibre-gl`; import its CSS (in `bio.css` or the island).
2. **Delete** `loadGoogleMaps` (script injection + single-flight promise) —
   plain import replaces it. Delete the `PUBLIC_GOOGLE_MAPS_API_KEY` /
   `PUBLIC_GOOGLE_MAPS_MAP_ID` plumbing in `bio.astro`, the `apiKey`/`mapId`
   props, and the keyless placeholder banner branch (no key to lack). Keep
   the `failed` state for tile/style load errors if desired.
3. **makeMap →** `new maplibregl.Map({ container, style, center: [lng, lat],
   zoom, cooperativeGestures: true, attributionControl: ... })` plus
   `NavigationControl` for zoom buttons. ODbL requires visible attribution
   ("© OpenStreetMap contributors") — keep the default control.
   ⚠ MapLibre speaks `[lng, lat]` arrays everywhere Google spoke
   `{ lat, lng }` objects — this is where the bugs will live.
4. **Theme toggle:** replace the MutationObserver map-rebuild with
   `map.setStyle(lightStyle | darkStyle)` on the same instance. The whole
   `mapEpoch` state and marker-reattach machinery goes away (markers attach
   to the map instance, which now survives). This supersedes
   [ADR 0002](../adr/0002-rebuild-map-on-theme-toggle.md) — write a new ADR
   noting it.
5. **Markers:** `new maplibregl.Marker({ element: pinDiv, anchor: 'bottom' })
   .setLngLat([lng, lat]).addTo(map)`. The pin div is the same
   `pinSvg(...)` content with the same drop animation and click handler —
   and the `gmp-click`/focus-fighting workarounds (mousedown preventDefault,
   deferred smooth scroll) can likely be removed; verify the smooth scroll
   survives a marker click before deleting them. Tooltip: `title` attribute
   on the pin div, or a MapLibre Popup if we want styling.
6. **Camera calls:** `setCenter(cam.center)` → `map.jumpTo({ center })`;
   `panTo(...)` → `map.easeTo({ center })`; `getCenter()/getZoom()` exist
   as-is. `dragstart` event exists verbatim for the takeover flag; the
   Street View takeover listener is deleted (or replaced by the external
   link, which needs no takeover).
7. **Resize:** MapLibre observes its container (`trackResize` defaults on) —
   the expand/collapse `transitionend` handler likely shrinks to just the
   post-resize `trackCamera()` re-center. Verify during the height
   transition.
8. **Cleanup:** drop `.env` keys, README/AGENTS mentions of the Google key,
   and the placeholder-banner CSS (`tl-map--placeholder`, chips) if the
   placeholder is deleted. Update CONTEXT.md if any term references Google
   specifics.

## Losses to accept (decided above, restated for the record)

- Street View / pegman — the only non-cosmetic loss.
- Google's basemap richness (POI density, satellite layer, familiar look).
- The cloud-styled map ID styling — replaced by style JSON we fully control.

## Verification

Mirror the camera-track verification run (see git history of
`~/.claude/plans/` or the PR that landed the camera track):

1. Scroll: center glides pin-to-pin, zoom never changes (`__tlMap`-style dev
   handle: expose the MapLibre instance in dev).
2. Manual zoom persists across scrolling; drag pauses the camera, next
   scroll eases back onto the track.
3. Rail-pin click centers without touching zoom; map-pin click smooth-scrolls
   the timeline (this is where the removed Google focus workarounds could
   bite — test on Chrome + Safari).
4. Theme toggle restyles in place; markers and reader zoom survive.
5. Newest-first toggle, tag filter, expand/collapse re-derive correctly.
6. Wheel over the map scrolls the page; Ctrl+wheel/pinch zooms the map.
7. Attribution visible in both themes; `astro build` passes; page has zero
   requests to google domains (check the network panel — that's the point).
