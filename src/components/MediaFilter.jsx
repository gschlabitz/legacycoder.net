import { useEffect, useRef, useState } from "react";
import { mediaMatches, queryValues } from "../lib/media-filter.js";

function toggleSetValue(setValue, value) {
  setValue((previous) => {
    const next = new Set(previous);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });
}

export default function MediaFilter({ types, statuses }) {
  const [checkedTypes, setCheckedTypes] = useState(() => new Set(types));
  const [checkedStatuses, setCheckedStatuses] = useState(
    () => new Set(statuses),
  );
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const typeFiltering = checkedTypes.size < types.length;
  const statusFiltering = checkedStatuses.size < statuses.length;
  const filtering = typeFiltering || statusFiltering || recommendedOnly;

  // Apply deep links after mount so the server HTML and first client render
  // agree. A facet containing only unknown values stays fully inclusive.
  useEffect(() => {
    const wantedTypes = queryValues(window.location.search, "type", types);
    const wantedStatuses = queryValues(
      window.location.search,
      "status",
      statuses,
    );
    if (wantedTypes.length) setCheckedTypes(new Set(wantedTypes));
    if (wantedStatuses.length) setCheckedStatuses(new Set(wantedStatuses));

    const recommended = new URLSearchParams(window.location.search).get(
      "recommended",
    );
    if (recommended === "true" || recommended === "1") {
      setRecommendedOnly(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    let visibleCount = 0;
    const entries = document.querySelectorAll("[data-media-entry]");

    for (const entry of entries) {
      const visible = mediaMatches(
        {
          type: entry.dataset.type,
          status: entry.dataset.status,
          recommended: entry.dataset.recommended === "true",
        },
        {
          checkedTypes,
          checkedStatuses,
          recommendedOnly,
          typeFiltering,
          statusFiltering,
        },
      );
      entry.toggleAttribute("hidden", !visible);
      if (visible) visibleCount += 1;
    }

    const emptyState = document.querySelector("[data-media-empty]");
    emptyState?.toggleAttribute("hidden", visibleCount > 0);
  }, [checkedTypes, checkedStatuses, recommendedOnly]);

  return (
    <div className="media-filter" ref={rootRef}>
      <button
        type="button"
        className={
          "media-filter-toggle" +
          (filtering ? " media-filter-toggle--filtering" : "")
        }
        aria-expanded={open}
        aria-label="Filter media"
        onClick={() => setOpen((value) => !value)}
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
        <span>Filter</span>
      </button>

      {open && (
        <div className="media-filter-pop" aria-label="Media filters">
          <fieldset>
            <legend>Type</legend>
            <div className="media-filter-options">
              {types.map((type) => (
                <label key={type} className="media-filter-item">
                  <input
                    type="checkbox"
                    checked={checkedTypes.has(type)}
                    onChange={() => toggleSetValue(setCheckedTypes, type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Status</legend>
            <div className="media-filter-options">
              {statuses.map((status) => (
                <label key={status} className="media-filter-item">
                  <input
                    type="checkbox"
                    checked={checkedStatuses.has(status)}
                    onChange={() =>
                      toggleSetValue(setCheckedStatuses, status)
                    }
                  />
                  <span>{status}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="media-filter-item media-filter-recommended">
            <input
              type="checkbox"
              checked={recommendedOnly}
              onChange={(event) => setRecommendedOnly(event.target.checked)}
            />
            <span>recommended only</span>
          </label>
        </div>
      )}
    </div>
  );
}
