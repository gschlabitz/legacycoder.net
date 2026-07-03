import { useState, useEffect, useRef } from "react";

// Tag filter for the /bio timeline, living inside the sticky WORK/LIFE
// header: a funnel button that opens a popup of alphabetized tag toggles.
// The timeline itself is server-rendered static HTML (see src/pages/bio.astro);
// this island only owns the filter state and reflects it onto the DOM by
// toggling a `hidden` attribute on each event and on any year section left
// with no visible events.
export default function TimelineFilter({ tags }) {
  const sorted = [...tags].sort((a, b) => a.localeCompare(b));
  const [active, setActive] = useState(() => new Set());
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  function toggle(tag) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  // Close the popup on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const events = document.querySelectorAll("[data-timeline-event]");
    for (const el of events) {
      const eventTags = (el.dataset.tags || "").split(",").filter(Boolean);
      // No active filter shows everything; otherwise match ANY selected tag.
      const visible =
        active.size === 0 || eventTags.some((t) => active.has(t));
      el.toggleAttribute("hidden", !visible);
    }

    // Hide a year heading when the filter emptied its section.
    const years = document.querySelectorAll("[data-timeline-year]");
    for (const section of years) {
      const anyVisible = section.querySelector(
        "[data-timeline-event]:not([hidden])"
      );
      section.toggleAttribute("hidden", !anyVisible);
    }
  }, [active]);

  return (
    <div className="tl-filter" ref={rootRef}>
      <button
        type="button"
        className="tl-filter-toggle"
        aria-expanded={open}
        aria-label="Filter events by tag"
        onClick={() => setOpen((o) => !o)}
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
          <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
        </svg>
        {active.size > 0 && (
          <span className="tl-filter-count">{active.size}</span>
        )}
      </button>
      {open && (
        <div className="tl-filter-pop" role="group" aria-label="Toggle tags">
          {sorted.map((tag) => (
            <label key={tag} className="tl-filter-item">
              <input
                type="checkbox"
                checked={active.has(tag)}
                onChange={() => toggle(tag)}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
