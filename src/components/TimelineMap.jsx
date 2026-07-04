import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { iconSvg, pinSvg } from "../lib/tag-pins.js";

// Google Map banner for the /bio timeline, fixed across the bottom of the
// viewport. Two scroll-driven concepts drive it (terms defined in
// CONTEXT.md):
//
// - Pin reveal: a pin drops once any of its place's events has been reached
//   OR passed, and stays for the rest of the visit (position checks on the
//   server-rendered `[data-event-id]` articles, not IntersectionObserver —
//   see docs/adr/0001).
// - Camera track: the map center travels the piecewise line through the
//   event pins in on-screen order, geared linearly to scroll — the camera
//   never changes zoom (it opens at city scale; the zoom control is the
//   reader's alone). The centered event — the article whose midpoint sits
//   nearest the midpoint of the band left visible above the banner — puts
//   the center exactly on its pin; between two midpoints the center is the
//   lat/lng lerp between their pins. Every event has coordinates (the
//   content schema requires them), so the track has no holes.
//
// `places` is prepared at build time in bio.astro: events sharing coordinates
// are grouped into one place ({ lat, lng, label, color, icon, titles,
// eventIds }) so repeat locations don't stack identical markers. `icon` is
// the tag icon of the place's first event — markers render the same pin SVG
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

// The one zoom level the camera ever sets: city scale at boot. Zoom belongs
// to the reader from then on — the camera only pans.
const OPEN_ZOOM = 10;

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
  // Index into `places` of the centered event's place. Only the keyless
  // placeholder banner consumes it (chip highlight) — the real camera writes
  // straight to the map, keeping React re-renders off the scroll path.
  const [centered, setCentered] = useState(null);
  // Set while the reader is exploring the map (drag or Street View — zoom is
  // theirs to keep, so it never counts) — the scroll-geared camera pauses so
  // they aren't yanked back mid-exploration. Only borrowed, though: scrolling
  // the timeline again means they're back to reading the story, which pans
  // the camera back onto the track (see the camera effect below).
  const userTookOverRef = useRef(false);
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

  // Event id -> index into `places`; shared by the camera track, the reveal
  // spy, and the rail-pin click handler.
  const placeByEvent = useMemo(() => {
    const byEvent = new Map();
    places.forEach((place, i) =>
      place.eventIds.forEach((id) => byEvent.set(id, i))
    );
    return byEvent;
  }, [places]);

  // The camera track, sampled at the current scroll position. The event
  // articles' midpoints are the track's stops, in on-screen order (sorted by
  // rect, so the newest-first toggle and the split work/life columns come
  // out right); the band midline picks the segment and the lerp parameter.
  // Rects are read live — a couple dozen articles per sample — so the tag
  // filter and the order toggle self-correct on the next sample with no
  // cache to invalidate. Returns { center, nearest }: the lat/lng for the
  // map and the place index of the centered event — or null while the tag
  // filter has hidden every event.
  const trackCamera = () => {
    const midline =
      (window.innerHeight - (asideRef.current?.offsetHeight ?? 0)) / 2;
    const stops = [];
    for (const el of document.querySelectorAll("[data-event-id]")) {
      const i = placeByEvent.get(el.dataset.eventId);
      if (i === undefined) continue;
      const rect = el.getBoundingClientRect();
      // Skip events display:none'd by the tag filter (zero-size rect).
      if (rect.width === 0 && rect.height === 0) continue;
      stops.push({ mid: (rect.top + rect.bottom) / 2, place: i });
    }
    if (!stops.length) return null;
    stops.sort((a, b) => a.mid - b.mid);
    const at = (i) => ({
      lat: places[stops[i].place].lat,
      lng: places[stops[i].place].lng,
    });
    // Before the first midpoint / past the last, the track clamps to its end.
    if (midline <= stops[0].mid)
      return { center: at(0), nearest: stops[0].place };
    const last = stops.length - 1;
    if (midline >= stops[last].mid)
      return { center: at(last), nearest: stops[last].place };
    const b = stops.findIndex((s) => s.mid >= midline);
    const span = stops[b].mid - stops[b - 1].mid;
    const t = span === 0 ? 1 : (midline - stops[b - 1].mid) / span;
    const from = at(b - 1);
    const to = at(b);
    return {
      center: {
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      },
      nearest: stops[t < 0.5 ? b - 1 : b].place,
    };
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
  // story hasn't reached it yet — zoom untouched (panTo glides when the
  // place is near, cuts when far). Centering counts as the reader taking
  // over the camera: it holds until they scroll, which pans it back onto
  // the track (see the camera effect below). Delegated, since the pins are
  // static DOM.
  useEffect(() => {
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
      ctx.map.panTo({ lat: places[i].lat, lng: places[i].lng });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [places, placeByEvent]);

  // Google Maps doesn't watch its container for size changes: once the
  // expand/collapse transition finishes, nudge it to pick up the new
  // dimensions and re-derive the track position — the band above the banner
  // changed height, so the centered event moved — unless the reader has
  // taken over the camera themselves.
  useEffect(() => {
    const el = asideRef.current;
    const ctx = mapRef.current;
    if (!el || !ctx) return;
    const onTransitionEnd = (e) => {
      if (e.propertyName !== "height") return;
      ctx.maps.event.trigger(ctx.map, "resize");
      if (userTookOverRef.current) return;
      const cam = trackCamera();
      if (cam) ctx.map.setCenter(cam.center);
    };
    el.addEventListener("transitionend", onTransitionEnd);
    return () => el.removeEventListener("transitionend", onTransitionEnd);
  }, [places, ready]);

  // Detect the reader taking manual control (drag or Street View) so the
  // scroll-geared camera below knows to pause. Zoom deliberately doesn't
  // count: the camera never writes zoom, so zooming needs no pause — the pan
  // simply continues at the reader's level. Our own setCenter/panTo calls
  // never fire these gesture events, so no programmatic guard is needed.
  // Scrolling the timeline takes the camera back: exploring is a detour,
  // reading is the primary mode, and the page scrolling is the clearest
  // signal the reader has returned to it. (Wheel-scrolling over the map
  // counts — under "cooperative" gestures a plain wheel scrolls the page.)
  // Re-attaches after a theme rebuild (mapEpoch), which also resumes the
  // geared camera since that's a fresh map instance.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    userTookOverRef.current = false;
    const takeOver = () => {
      userTookOverRef.current = true;
    };
    const streetView = ctx.map.getStreetView();
    const listeners = [
      ctx.maps.event.addListener(ctx.map, "dragstart", takeOver),
      streetView.addListener("visible_changed", () => {
        if (streetView.getVisible()) takeOver();
      }),
    ];
    return () => listeners.forEach((l) => l.remove());
  }, [ready, mapEpoch]);

  // Scroll spy: one rect pass per tick computes both reveal (reached or
  // passed → accumulates) and the centered event (article midpoint nearest
  // the band midline → the placeholder's chip highlight; the real camera
  // samples the track itself, unthrottled). Runs in both real-map and
  // placeholder modes.
  useEffect(() => {
    const located = [...document.querySelectorAll("[data-event-id]")].filter(
      (el) => placeByEvent.has(el.dataset.eventId)
    );
    const pending = new Set(located);

    const check = () => {
      // The banner owns the bottom ~quarter of the viewport; reveal triggers
      // once an event overlaps the band between the viewport top and the map.
      const limit = window.innerHeight * 0.75;
      const midline =
        (window.innerHeight - (asideRef.current?.offsetHeight ?? 0)) / 2;
      const hits = [];
      let nearest = null;
      let nearestDist = Infinity;
      for (const el of located) {
        const rect = el.getBoundingClientRect();
        // Skip events display:none'd by the tag filter (zero-size rect).
        if (rect.width === 0 && rect.height === 0) continue;
        const dist = Math.abs((rect.top + rect.bottom) / 2 - midline);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = placeByEvent.get(el.dataset.eventId);
        }
        if (rect.top >= limit) continue; // not reached yet
        if (pending.has(el)) {
          hits.push(placeByEvent.get(el.dataset.eventId));
          pending.delete(el);
        }
      }
      if (hits.length) setRevealed((prev) => new Set([...prev, ...hits]));
      // A primitive, so React skips the re-render while it doesn't change.
      setCentered(nearest);
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
  }, [places, placeByEvent]);

  // Advanced markers require a map ID; without a custom one (cloud-styled,
  // set via PUBLIC_GOOGLE_MAPS_MAP_ID), Google's documented sandbox ID keeps
  // the default styling. Note a map ID means the map's look is cloud-owned —
  // inline `styles` arrays would be ignored, so theming rides on the API's
  // colorScheme instead.
  const makeMap = (maps, camera) =>
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
      // { center, zoom } — the only time the camera's zoom is ever written.
      ...camera,
    });

  // Boot the map: open at city scale on the track position — the first
  // event's pin at the top of the page, or wherever a restored scroll
  // position lands.
  useEffect(() => {
    // canvasRef only exists once the portal has rendered.
    if (!apiKey || !mounted) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        const cam = trackCamera();
        const map = makeMap(maps, {
          center: cam?.center ?? { lat: places[0].lat, lng: places[0].lng },
          zoom: OPEN_ZOOM,
        });
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
        // Ringed icons at 72px total: a 44px head plus the stem down to the
        // anchored coordinate.
        pin.innerHTML = pinSvg(place.icon ? 72 : 30, place.icon);
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

  // Camera: glide along the camera track in sync with scroll. rAF-gated —
  // one track sample per frame at most, with no further throttle: the pan is
  // the scroll's mirror, so it must track every frame (setCenter, not panTo;
  // the scroll itself supplies the motion). The first scroll after a manual
  // takeover instead pans back onto the track — smooth when near, a cut
  // when far, panTo's native behavior — and the gearing resumes from there.
  // Re-attaches after a theme rebuild (mapEpoch) against the fresh map.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    let raf = null;
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const cam = trackCamera();
        if (!cam) return;
        if (userTookOverRef.current) {
          userTookOverRef.current = false;
          ctx.map.panTo(cam.center);
        } else {
          ctx.map.setCenter(cam.center);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ready, mapEpoch, places, placeByEvent]);

  // Follow Starlight's dark/light toggle (data-theme on <html>). colorScheme
  // is fixed at construction, so a toggle means rebuilding the map on the
  // same canvas; bumping mapEpoch re-runs the marker effect against it. The
  // old map's center and zoom carry over — the reader's zoom survives the
  // rebuild.
  useEffect(() => {
    if (!ready) return;
    const observer = new MutationObserver(() => {
      const ctx = mapRef.current;
      if (!ctx || !canvasRef.current) return;
      ctx.map = makeMap(ctx.maps, {
        center: ctx.map.getCenter(),
        zoom: ctx.map.getZoom(),
      });
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
      <aside
        ref={asideRef}
        className="tl-map tl-map--placeholder"
        aria-label="Journey map"
      >
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
              className={centered === i ? "tl-map-pin--centered" : undefined}
            >
              {/* Chip click = marker click: scroll to the place's event. */}
              <button type="button" onClick={() => scrollToPlace(i)}>
                {place.icon ? (
                  <span
                    className="tl-map-chip-icon"
                    dangerouslySetInnerHTML={{ __html: iconSvg(place.icon) }}
                  />
                ) : (
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
