import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Google Map banner for the /bio timeline, fixed across the bottom of the
// viewport. The extra-wide, short box suits the story's geography — the view
// is fitted once to ALL event locations so the whole east-to-west arc
// (Berlin → San Francisco) is on screen from the start, and pins drop in as
// the user scrolls their events into view. A place counts as revealed once
// any of its events has been reached OR passed (position check on the
// server-rendered `[data-event-id]` articles, not an IntersectionObserver —
// a jump to the bottom must not skip pins whose events flew past the
// viewport between frames). Once revealed, a pin stays.
//
// `places` is prepared at build time in bio.astro: events sharing coordinates
// are grouped into one place ({ lat, lng, label, titles, eventIds }) so
// repeat locations don't stack identical markers.
//
// Without an API key (PUBLIC_GOOGLE_MAPS_API_KEY) the island renders a
// placeholder banner in its stead that lists revealed places as chips — the
// scroll-reveal wiring stays exercisable in dev before a key exists.

// Classic-marker map styles so theming needs no cloud map ID. Dark set is
// Google's stock "night mode" palette, tuned to hide POI/transit clutter.
const DARK_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const LIGHT_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Single-flight loader for the Maps JS API (survives multiple islands/HMR).
function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (window.__tlMapsLoading) return window.__tlMapsLoading;
  window.__tlMapsLoading = new Promise((resolve, reject) => {
    window.__tlMapsReady = () => resolve(window.google.maps);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
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

function currentStyles() {
  return document.documentElement.dataset.theme === "light"
    ? LIGHT_STYLES
    : DARK_STYLES;
}

export default function TimelineMap({ apiKey, places }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null); // { maps, map } once the API is up
  const markersRef = useRef(new Map()); // place index -> Marker
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // Indices into `places` whose pins have been revealed by scrolling.
  const [revealed, setRevealed] = useState(() => new Set());
  // The banner is portaled to <body>: Starlight's layout puts a transform on
  // an ancestor, which would turn it into the containing block for our
  // position: fixed strip. Portals need the DOM, so wait for mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Scroll spy: reveal a place once any of its events has been scrolled to
  // (or past). Runs in both real-map and placeholder modes.
  useEffect(() => {
    const placeByEvent = new Map();
    places.forEach((place, i) =>
      place.eventIds.forEach((id) => placeByEvent.set(id, i))
    );
    const pending = new Set(
      [...document.querySelectorAll("[data-event-id]")].filter((el) =>
        placeByEvent.has(el.dataset.eventId)
      )
    );

    const check = () => {
      // The banner owns the bottom ~quarter of the viewport; an event counts
      // as "seen" once its top clears above the map.
      const limit = window.innerHeight * 0.75;
      const hits = [];
      for (const el of pending) {
        const rect = el.getBoundingClientRect();
        // Skip events display:none'd by the tag filter (zero-size rect).
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.top < limit) {
          hits.push(placeByEvent.get(el.dataset.eventId));
          pending.delete(el);
        }
      }
      if (hits.length) setRevealed((prev) => new Set([...prev, ...hits]));
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

  // Boot the map. Non-interactive on purpose — it's a banner, not a widget;
  // capturing scroll/drag at the bottom edge of every scroll would be hostile.
  useEffect(() => {
    // canvasRef only exists once the portal has rendered.
    if (!apiKey || !mounted) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        const map = new maps.Map(canvasRef.current, {
          disableDefaultUI: true,
          gestureHandling: "none",
          keyboardShortcuts: false,
          styles: currentStyles(),
        });
        const bounds = new maps.LatLngBounds();
        for (const place of places) {
          bounds.extend({ lat: place.lat, lng: place.lng });
        }
        map.fitBounds(bounds, { top: 32, bottom: 32, left: 64, right: 64 });
        mapRef.current = { maps, map };
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, places, mounted]);

  // Drop a marker for each newly revealed place.
  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx) return;
    for (const i of revealed) {
      if (markersRef.current.has(i)) continue;
      const place = places[i];
      markersRef.current.set(
        i,
        new ctx.maps.Marker({
          map: ctx.map,
          position: { lat: place.lat, lng: place.lng },
          animation: ctx.maps.Animation.DROP,
          title: `${place.label}: ${place.titles.join(" · ")}`,
        })
      );
    }
  }, [revealed, ready, places]);

  // Follow Starlight's dark/light toggle (data-theme on <html>).
  useEffect(() => {
    if (!ready) return;
    const apply = () =>
      mapRef.current.map.setOptions({ styles: currentStyles() });
    const observer = new MutationObserver(apply);
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
            <li key={i} hidden={!revealed.has(i)}>
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
