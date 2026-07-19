import { useEffect, useState } from "react";

// Order toggle for the /bio timeline, next to the tag filter in the sticky
// WORK/LIFE header. The DOM keeps its chronological order (so the filter
// island and the map's scroll spy are unaffected); the `tl-newest-first`
// class on the .timeline root only flips the VISUAL order of the year
// sections and of the events inside each year (flex column-reverse in
// bio.css). The static HTML ships with the class on — newest-first is the
// default — and this island encodes the state in the ?order= url param:
// absent means newest-first, ?order=oldest removes the class after mount.
export default function TimelineOrder() {
  const [newestFirst, setNewestFirst] = useState(true);

  // Apply the ?order= param after mount (not in the state initializer) so
  // server HTML and first client render agree. Anything but an explicit
  // "oldest" falls back to the default.
  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get("order");
    if (order === "oldest") setNewestFirst(false);
  }, []);

  useEffect(() => {
    document
      .querySelector(".timeline")
      ?.classList.toggle("tl-newest-first", newestFirst);
    // The map's scroll spy recomputes reveal/focus on scroll ticks only —
    // poke it so the camera reframes to what the reorder put on screen.
    window.dispatchEvent(new Event("scroll"));
  }, [newestFirst]);

  function toggle() {
    const next = !newestFirst;
    setNewestFirst(next);
    // Reflect the state in the url so an order is shareable; the default
    // needs no param, keeping plain /bio/ urls clean. Other params (e.g.
    // ?tags=) are preserved.
    const params = new URLSearchParams(window.location.search);
    if (next) {
      params.delete("order");
    } else {
      params.set("order", "oldest");
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "")
    );
  }

  return (
    <button
      type="button"
      className="tl-filter-toggle tl-order-toggle"
      aria-pressed={newestFirst}
      aria-label={newestFirst ? "Show oldest first" : "Show newest first"}
      title={newestFirst ? "Oldest first" : "Newest first"}
      onClick={toggle}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 4v16" />
        <path d="M3 16l4 4 4-4" />
        <path d="M13 5h8" />
        <path d="M13 10h6" />
        <path d="M13 15h4" />
      </svg>
    </button>
  );
}
