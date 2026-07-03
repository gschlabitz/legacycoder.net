import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// are grouped into one place ({ lat, lng, label, titles, eventIds }) so
// repeat locations don't stack identical markers.
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
  // The banner is portaled to <body>: Starlight's layout puts a transform on
  // an ancestor, which would turn it into the containing block for our
  // position: fixed strip. Portals need the DOM, so wait for mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      disableDefaultUI: true,
      gestureHandling: "none",
      keyboardShortcuts: false,
      // Keep fitBounds on a lone revealed city at a regional view — a
      // 100%-wide-but-short banner is useless at street level.
      maxZoom: 10,
      mapId: mapId || "DEMO_MAP_ID",
      colorScheme: currentScheme(),
    });

  // Boot the map. Non-interactive on purpose — it's a banner, not a widget;
  // capturing scroll/drag at the bottom edge of every scroll would be hostile.
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
        // AdvancedMarkerElement has no built-in DROP animation; run the
        // equivalent as a CSS animation on the pin (see bio.css), removed on
        // completion so a theme rebuild doesn't replay it. PinElement is
        // itself a <gmp-pin> element — its `.element` accessor is deprecated.
        const pin = new ctx.maps.marker.PinElement();
        pin.classList.add("tl-map-pin-drop");
        pin.addEventListener(
          "animationend",
          () => pin.classList.remove("tl-map-pin-drop"),
          { once: true }
        );
        marker = new ctx.maps.marker.AdvancedMarkerElement({
          position: { lat: place.lat, lng: place.lng },
          content: pin,
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
  // Re-runs after a theme rebuild (mapEpoch) to re-frame the fresh map.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    if (focus.size) {
      lastFramingRef.current = [...focus].map((i) => places[i]);
    }
    const frame = lastFramingRef.current ?? [places[0]];
    const bounds = new ctx.maps.LatLngBounds();
    for (const place of frame) {
      bounds.extend({ lat: place.lat, lng: place.lng });
    }
    ctx.map.fitBounds(bounds, { top: 32, bottom: 32, left: 64, right: 64 });
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

  const banner =
    !apiKey || failed ? (
      <aside className="tl-map tl-map--placeholder" aria-label="Journey map">
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
              📍 {place.label}
            </li>
          ))}
        </ul>
      </aside>
    ) : (
      <aside className="tl-map" aria-label="Map of places on this timeline">
        <div ref={canvasRef} className="tl-map-canvas" />
      </aside>
    );

  return createPortal(banner, document.body);
}
