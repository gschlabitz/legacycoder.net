import { useEffect, useState } from "react";

// Order toggle for the /bio timeline, next to the tag filter in the sticky
// WORK/LIFE header. The timeline is server-rendered oldest-first; this island
// only flips a class on the .timeline root that reverses the VISUAL order of
// the year sections and of the events inside each year (flex column-reverse
// in bio.css) — the DOM keeps its chronological order, so the filter island
// and the map's scroll spy are unaffected.
export default function TimelineOrder() {
  const [newestFirst, setNewestFirst] = useState(false);

  useEffect(() => {
    document
      .querySelector(".timeline")
      ?.classList.toggle("tl-newest-first", newestFirst);
    // The map's scroll spy recomputes reveal/focus on scroll ticks only —
    // poke it so the camera reframes to what the reorder put on screen.
    window.dispatchEvent(new Event("scroll"));
  }, [newestFirst]);

  return (
    <button
      type="button"
      className="tl-filter-toggle tl-order-toggle"
      aria-pressed={newestFirst}
      aria-label={newestFirst ? "Show oldest first" : "Show newest first"}
      title={newestFirst ? "Oldest first" : "Newest first"}
      onClick={() => setNewestFirst((v) => !v)}
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
