import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pinSvg } from "../lib/tag-pins.js";

// Google Map banner for the /bio timeline, fixed across the bottom of the
// viewport. Two scroll-driven concepts share one rect pass (terms defined in
// CONTEXT.md):
//
// - Pin reveal: a pin drops once any of its place's events has been reached
//   OR passed, and stays for the rest of the visit (position checks on the
//   server-rendered `[data-event-id]` articles, not IntersectionObserver —
//   see docs/adr/0001).
// - Focus: the camera frames the places of the located events currently on
//   screen — tight while the story sits in one city, widening while events
//   from two places share the screen, tightening again when it settles into
//   the new place. While no located event is on screen the camera holds its
//   last framing (the map never moves without a visible cause); before the
//   first one, it opens on the journey's first place.
//
// `places` is prepared at build time in bio.astro: events sharing coordinates
// are grouped into one place ({ lat, lng, label, color, glyph, titles,
// eventIds }) so repeat locations don't stack identical markers. `glyph` is
// the tag emoji of the place's first event — markers render the same pin SVG
// as the timeline rail (src/lib/tag-pins.js), in the one rail-tinted pin
// color, so rail and map pins match at a glance. `color` (the per-tag hue)
// only tints the keyless placeholder's chip dots these days.
//
// Pins are also the cross-navigation between the two views: clicking a rail
// pin centers the map on that event's place (revealing its marker if the
// story hasn't reached it yet), and clicking a map marker scrolls the
// timeline to its event — repeat clicks cycle through the events of a place
// that hosts several.
//
// Without an API key (PUBLIC_GOOGLE_MAPS_API_KEY) the island renders a
// placeholder banner in its stead that lists revealed places as chips — the
// scroll-reveal wiring stays exercisable in dev before a key exists.

// Single-flight loader for the Maps JS API (survives multiple islands/HMR).
// The marker library is requested up front — AdvancedMarkerElement lives in
// `google.maps.marker`, not the core namespace.
function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.marker) return Promise.resolve(window.google.maps);
  if (window.__tlMapsLoading) return window.__tlMapsLoading;
  window.__tlMapsLoading = new Promise((resolve, reject) => {
    window.__tlMapsReady = () => resolve(window.google.maps);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "marker",
      loading: "async",
      callback: "__tlMapsReady",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () =>
      reject(new Error("Failed to load the Google Maps script"));
    document.head.appendChild(script);
  });
  return window.__tlMapsLoading;
}

// Starlight's dark/light toggle (data-theme on <html>) → Maps color scheme.
function currentScheme() {
  return document.documentElement.dataset.theme === "light" ? "LIGHT" : "DARK";
}

export default function TimelineMap({ apiKey, mapId, places }) {
  const canvasRef = useRef(null);
  const asideRef = useRef(null); // the <aside class="tl-map">, for its height transition
  const mapRef = useRef(null); // { maps, map } once the API is up
  const markersRef = useRef(new Map()); // place index -> AdvancedMarkerElement
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // Bumped when the map instance is rebuilt (theme toggle) so the marker
  // effect reattaches existing pins to the fresh map.
  const [mapEpoch, setMapEpoch] = useState(0);
  // Indices into `places` whose pins have been revealed by scrolling.
  const [revealed, setRevealed] = useState(() => new Set());
  // Indices into `places` that are in focus (an event of theirs on screen).
  const [focus, setFocus] = useState(() => new Set());
  // The last places the camera framed, held while the focus is empty.
  const lastFramingRef = useRef(null);
  // Set while the reader is exploring the map (pan, zoom, or Street View) —
  // auto-framing backs off so they aren't yanked back to the "current"
  // event's place mid-exploration. Only borrowed, though: scrolling the
  // timeline again means they're back to reading the story, which returns
  // the camera to auto-framing (see the takeover effect below).
  const userTookOverRef = useRef(false);
  // True only for the duration of one of our own fitBounds/setZoom calls, so
  // the zoom_changed/dragstart events they trigger aren't mistaken for the
  // reader's own gestures.
  const programmaticRef = useRef(false);
  // Grows the banner to half the viewport via the Expand tab; drives
  // --tl-map-h on <html> (see bio.css) so both the fixed banner and the
  // page's clearance padding pick it up.
  const [expanded, setExpanded] = useState(false);
  // The banner is portaled to <body>: Starlight's layout puts a transform on
  // an ancestor, which would turn it into the containing block for our
  // position: fixed strip. Portals need the DOM, so wait for mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.classList.toggle("tl-map-expanded", expanded);
  }, [expanded]);

  // Shared by the scroll-driven camera effect and the post-resize re-fit
  // below. Clamps the auto-fit to zoom 10 — a lone revealed city at street
  // level would be useless in a banner this short — without capping how far
  // the reader can zoom in manually afterward.
  const applyFraming = (ctx, frame) => {
    programmaticRef.current = true;
    const bounds = new ctx.maps.LatLngBounds();
    for (const place of frame) bounds.extend({ lat: place.lat, lng: place.lng });
    ctx.map.fitBounds(bounds, { top: 32, bottom: 32, left: 64, right: 64 });
    ctx.maps.event.addListenerOnce(ctx.map, "idle", () => {
      if (ctx.map.getZoom() > 10) ctx.map.setZoom(10);
      programmaticRef.current = false;
    });
  };

  // Clicking a map marker scrolls the timeline to its event. A place can
  // host several events (repeat locations share one marker), so repeat
  // clicks cycle through them chronologically; events hidden by the tag
  // filter are skipped. The scroll target sits a third of the way down the
  // band left visible above the banner, clear of the map at either height.
  const cycleRef = useRef(new Map()); // place index -> last visited position
  const scrollToPlace = (i) => {
    const els = places[i].eventIds
      .map((id) => document.querySelector(`[data-event-id="${id}"]`))
      .filter((el) => el && (el.offsetWidth || el.offsetHeight));
    if (!els.length) return;
    const next = ((cycleRef.current.get(i) ?? -1) + 1) % els.length;
    cycleRef.current.set(i, next);
    const band = window.innerHeight - (asideRef.current?.offsetHeight ?? 0);
    const target =
      window.scrollY + els[next].getBoundingClientRect().top - band / 3;
    // Deferred: Google Maps focuses the clicked marker right after this
    // handler, and that focus change cancels an already-running smooth
    // scroll. Waiting a tick lets the focus land first.
    setTimeout(() => {
      window.scrollTo({ top: target, behavior: "smooth" });
    }, 0);
  };

  // Clicking a rail pin (the tag pins bio.astro renders on the timeline
  // rail) centers the map on that event's place, revealing its marker if the
  // story hasn't reached it yet. Framing counts as the reader taking over
  // the camera: it holds until they scroll, which resumes auto-framing (see
  // the takeover effect below). Delegated, since the pins are static DOM.
  useEffect(() => {
    const placeByEvent = new Map();
    places.forEach((place, i) =>
      place.eventIds.forEach((id) => placeByEvent.set(id, i))
    );
    const onClick = (e) => {
      const pin = e.target.closest("button.tl-pin");
      if (!pin) return;
      const id = pin.closest("[data-event-id]")?.dataset.eventId;
      const i = placeByEvent.get(id);
      if (i === undefined) return;
      setRevealed((prev) =>
        prev.has(i) ? prev : new Set([...prev, i])
      );
      const ctx = mapRef.current;
      if (!ctx) return;
      userTookOverRef.current = true;
      applyFraming(ctx, [places[i]]);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [places]);

  // Google Maps doesn't watch its container for size changes: once the
  // expand/collapse transition finishes, nudge it to pick up the new
  // dimensions and re-fit the camera to the last framing (the canvas didn't
  // exist at that size when fitBounds last ran) — unless the reader has
  // taken over the camera themselves.
  useEffect(() => {
    const el = asideRef.current;
    const ctx = mapRef.current;
    if (!el || !ctx) return;
    const onTransitionEnd = (e) => {
      if (e.propertyName !== "height") return;
      ctx.maps.event.trigger(ctx.map, "resize");
      if (userTookOverRef.current) return;
      applyFraming(ctx, lastFramingRef.current ?? [places[0]]);
    };
    el.addEventListener("transitionend", onTransitionEnd);
    return () => el.removeEventListener("transitionend", onTransitionEnd);
  }, [places, ready]);

  // Detect the reader taking manual control (drag, zoom, or Street View) so
  // the scroll-driven camera effect below knows to pause auto-framing.
  // Guarded by `programmaticRef` so our own fitBounds/setZoom calls don't
  // trip it. Scrolling the timeline takes the camera back: exploring is a
  // detour, reading is the primary mode, and the page scrolling is the
  // clearest signal the reader has returned to it. (Wheel-scrolling over the
  // map counts — under "cooperative" gestures a plain wheel scrolls the
  // page.) Re-attaches after a theme rebuild (mapEpoch), which also resumes
  // auto-framing since that's a fresh map instance.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    userTookOverRef.current = false;
    const takeOver = () => {
      if (!programmaticRef.current) userTookOverRef.current = true;
    };
    const streetView = ctx.map.getStreetView();
    const listeners = [
      ctx.maps.event.addListener(ctx.map, "dragstart", takeOver),
      ctx.maps.event.addListener(ctx.map, "zoom_changed", takeOver),
      streetView.addListener("visible_changed", () => {
        if (streetView.getVisible()) takeOver();
      }),
    ];
    const onScroll = () => {
      if (!userTookOverRef.current) return;
      userTookOverRef.current = false;
      applyFraming(ctx, lastFramingRef.current ?? [places[0]]);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      listeners.forEach((l) => l.remove());
      window.removeEventListener("scroll", onScroll);
    };
  }, [ready, mapEpoch, places]);

  // Scroll spy: one rect pass per tick computes both reveal (reached or
  // passed → accumulates) and focus (on screen right now → moving window).
  // Runs in both real-map and placeholder modes.
  useEffect(() => {
    const placeByEvent = new Map();
    places.forEach((place, i) =>
      place.eventIds.forEach((id) => placeByEvent.set(id, i))
    );
    const located = [...document.querySelectorAll("[data-event-id]")].filter(
      (el) => placeByEvent.has(el.dataset.eventId)
    );
    const pending = new Set(located);

    const check = () => {
      // The banner owns the bottom ~quarter of the viewport; "on screen"
      // means overlapping the band between the viewport top and the map.
      const limit = window.innerHeight * 0.75;
      const hits = [];
      const nextFocus = new Set();
      for (const el of located) {
        const rect = el.getBoundingClientRect();
        // Skip events display:none'd by the tag filter (zero-size rect).
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.top >= limit) continue; // not reached yet
        const place = placeByEvent.get(el.dataset.eventId);
        if (pending.has(el)) {
          hits.push(place);
          pending.delete(el);
        }
        if (rect.bottom > 0) nextFocus.add(place); // not yet scrolled off top
      }
      if (hits.length) setRevealed((prev) => new Set([...prev, ...hits]));
      // Publish focus only when the set really changed — scroll ticks are
      // frequent, camera refits should not be. Returning `prev` keeps the
      // state referentially stable, so no re-render happens.
      setFocus((prev) =>
        prev.size === nextFocus.size && [...nextFocus].every((i) => prev.has(i))
          ? prev
          : nextFocus
      );
    };

    let throttle = null;
    const onScroll = () => {
      if (throttle) return;
      throttle = setTimeout(() => {
        throttle = null;
        check();
      }, 100);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      clearTimeout(throttle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [places]);

  // Advanced markers require a map ID; without a custom one (cloud-styled,
  // set via PUBLIC_GOOGLE_MAPS_MAP_ID), Google's documented sandbox ID keeps
  // the default styling. Note a map ID means the map's look is cloud-owned —
  // inline `styles` arrays would be ignored, so theming rides on the API's
  // colorScheme instead.
  const makeMap = (maps) =>
    new maps.Map(canvasRef.current, {
      // Blanket-hide the default UI, but re-enable zoom and Street View —
      // the reader can pan/zoom/drop the pegman in to explore a place.
      // "cooperative" keeps an ordinary mouse-wheel scroll over the banner
      // scrolling the page (Ctrl+scroll or pinch zooms the map instead), so
      // the map doesn't hijack scrolling at the bottom of every page.
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: true,
      gestureHandling: "cooperative",
      mapId: mapId || "DEMO_MAP_ID",
      colorScheme: currentScheme(),
    });

  // Boot the map.
  useEffect(() => {
    // canvasRef only exists once the portal has rendered.
    if (!apiKey || !mounted) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        const map = makeMap(maps);
        mapRef.current = { maps, map };
        if (import.meta.env.DEV) window.__tlMap = map;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, places, mounted]);

  // Drop a marker for each newly revealed place; pins accumulate for the
  // rest of the visit even when the camera moves elsewhere. Also reattaches
  // every pin after a theme rebuild (mapEpoch).
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    for (const i of revealed) {
      let marker = markersRef.current.get(i);
      if (!marker) {
        const place = places[i];
        // The marker content is the same tag pin SVG the timeline rail uses
        // (tag-pins.js), colored per place. AdvancedMarkerElement has no
        // built-in DROP animation; run the equivalent as a CSS animation on
        // the pin (see bio.css), removed on completion so a theme rebuild
        // doesn't replay it.
        const pin = document.createElement("div");
        pin.className = "tl-map-pin tl-map-pin-drop";
        // Ringed glyphs at 72px total: a 44px head plus the stem down to the
        // anchored coordinate.
        pin.innerHTML = pinSvg(place.glyph ? 72 : 30, place.glyph);
        // Listen on the content div, not the marker's gmp-click. The click
        // must not reach Google's own handlers: they focus the marker, and
        // the browser's scroll-into-view for that focus cancels (or fights)
        // our smooth scroll to the event. gmpClickable below still matters:
        // it's what turns pointer events on for the content.
        pin.addEventListener("mousedown", (e) => e.preventDefault());
        pin.addEventListener("click", (e) => {
          e.stopPropagation();
          scrollToPlace(i);
        });
        pin.addEventListener(
          "animationend",
          () => pin.classList.remove("tl-map-pin-drop"),
          { once: true }
        );
        marker = new ctx.maps.marker.AdvancedMarkerElement({
          position: { lat: place.lat, lng: place.lng },
          content: pin,
          gmpClickable: true,
          title: `${place.label}: ${place.titles.join(" · ")}`,
        });
        markersRef.current.set(i, marker);
      }
      marker.map = ctx.map;
    }
  }, [revealed, ready, places, mapEpoch]);

  // Camera: frame the focused places. While the focus is empty (a gap or an
  // unlocated stretch of the timeline), hold the last framing; before
  // anything has ever been framed, open on the journey's first place. Native
  // fitBounds transitions by design — smooth when near, a cut when far.
  // Re-runs after a theme rebuild (mapEpoch) to re-frame the fresh map. Backs
  // off once the reader has taken over the camera (see the effect above) —
  // still tracks the current framing underneath so a later theme rebuild
  // (which hands control back) opens on the right place.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    if (focus.size) {
      lastFramingRef.current = [...focus].map((i) => places[i]);
    }
    if (userTookOverRef.current) return;
    applyFraming(ctx, lastFramingRef.current ?? [places[0]]);
  }, [focus, ready, places, mapEpoch]);

  // Follow Starlight's dark/light toggle (data-theme on <html>). colorScheme
  // is fixed at construction, so a toggle means rebuilding the map on the
  // same canvas; bumping mapEpoch re-runs the marker effect against it.
  useEffect(() => {
    if (!ready) return;
    const observer = new MutationObserver(() => {
      const ctx = mapRef.current;
      if (!ctx || !canvasRef.current) return;
      ctx.map = makeMap(ctx.maps);
      if (import.meta.env.DEV) window.__tlMap = ctx.map;
      setMapEpoch((epoch) => epoch + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [ready]);

  if (!mounted) return null;

  const toggleButton = (
    <button
      type="button"
      className="tl-map-toggle"
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse the map" : "Expand the map"}
      onClick={() => setExpanded((e) => !e)}
    >
      {expanded ? "Collapse" : "Expand"}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );

  const banner =
    !apiKey || failed ? (
      <aside className="tl-map tl-map--placeholder" aria-label="Journey map">
        {toggleButton}
        <p className="tl-map-note">
          {failed
            ? "The Google Map failed to load."
            : "Journey map placeholder — set PUBLIC_GOOGLE_MAPS_API_KEY in .env to render it."}
        </p>
        <ul className="tl-map-pins">
          {places.map((place, i) => (
            <li
              key={i}
              hidden={!revealed.has(i)}
              className={focus.has(i) ? "tl-map-pin--focus" : undefined}
            >
              {/* Chip click = marker click: scroll to the place's event. */}
              <button type="button" onClick={() => scrollToPlace(i)}>
                {place.glyph ?? (
                  <span style={{ color: place.color }}>⬤</span>
                )}{" "}
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    ) : (
      <aside
        ref={asideRef}
        className="tl-map"
        aria-label="Map of places on this timeline"
      >
        {toggleButton}
        <div ref={canvasRef} className="tl-map-canvas" />
      </aside>
    );

  return createPortal(banner, document.body);
}
