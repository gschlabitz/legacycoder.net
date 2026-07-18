import { useState, useEffect, useRef } from "react";

// Tag filter for the /bio timeline, living inside the sticky WORK/LIFE
// header: a funnel button that opens a popup of alphabetized tag toggles.
// Inclusive semantics: every tag starts checked and an event stays visible
// as long as ANY of its tags is still checked; unchecking tags prunes events.
// The timeline itself is server-rendered static HTML (see src/pages/bio.astro);
// this island only owns the filter state and reflects it onto the DOM by
// toggling a `hidden` attribute on each event and on any year section left
// with no visible events.
export default function TimelineFilter({ tags }) {
  const sorted = [...tags].sort((a, b) => a.localeCompare(b));
  const [checked, setChecked] = useState(() => new Set(tags));
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const filtering = checked.size < tags.length;

  // Links elsewhere can open the timeline pre-filtered via ?tags=a,b or
  // repeated ?tags=a&tags=b params. Applied after mount (not in the state
  // initializer) so server HTML and first client render agree. Unknown tags
  // are dropped; if nothing valid remains, the filter stays fully open.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search)
      .getAll("tags")
      .flatMap((v) => v.split(","))
      .map((v) => v.trim().toLowerCase())
      .filter((v) => tags.includes(v));
    if (wanted.length) setChecked(new Set(wanted));
  }, []);

  function toggle(tag) {
    setChecked((prev) => {
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
      // Filtering narrows to the checked tags. Untagged events (most of the
      // archive — tagging is deliberate) are visible only while no filter is
      // active; they belong to no subject thread, so any active filter
      // prunes them.
      const visible = filtering
        ? eventTags.some((t) => checked.has(t))
        : true;
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
  }, [checked]);

  return (
    <div className="tl-filter" ref={rootRef}>
      <button
        type="button"
        className={
          "tl-filter-toggle" + (filtering ? " tl-filter-toggle--filtering" : "")
        }
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
      </button>
      {open && (
        <div className="tl-filter-pop" role="group" aria-label="Toggle tags">
          {sorted.map((tag) => (
            <label key={tag} className="tl-filter-item">
              <input
                type="checkbox"
                checked={checked.has(tag)}
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
