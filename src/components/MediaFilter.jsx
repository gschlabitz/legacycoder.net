import { useEffect, useRef, useState } from "react";
import {
  facetState,
  mediaMatches,
  queryText,
  queryValues,
} from "../lib/media-filter.js";

function toggleSetValue(setValue, value) {
  setValue((previous) => {
    const next = new Set(previous);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });
}

function FacetLine({ label, values, checked, setChecked }) {
  const allRef = useRef(null);
  const { checked: allSelected, indeterminate } = facetState(
    checked.size,
    values.length,
  );
  const labelId = `media-filter-${label.toLowerCase()}`;

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className="media-filter-line" role="group" aria-labelledby={labelId}>
      <span className="media-filter-label" id={labelId}>{label}</span>
      <div className="media-filter-options">
        <label className="media-filter-item">
          <input
            ref={allRef}
            type="checkbox"
            checked={allSelected}
            onChange={() => setChecked(allSelected ? new Set() : new Set(values))}
          />
          <span>All</span>
        </label>
        {values.map((value) => (
          <label key={value} className="media-filter-item">
            <input
              type="checkbox"
              checked={checked.has(value)}
              onChange={() => toggleSetValue(setChecked, value)}
            />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function MediaFilter({ types, statuses }) {
  const [checkedTypes, setCheckedTypes] = useState(() => new Set(types));
  const [checkedStatuses, setCheckedStatuses] = useState(
    () => new Set(statuses),
  );
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [yearQuery, setYearQuery] = useState("");
  const [bylineQuery, setBylineQuery] = useState("");

  const typeFiltering = checkedTypes.size < types.length;
  const statusFiltering = checkedStatuses.size < statuses.length;
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
    setYearQuery(queryText(window.location.search, "year"));
    setBylineQuery(queryText(window.location.search, "byline"));
  }, [types, statuses]);

  useEffect(() => {
    let visibleCount = 0;
    const entries = document.querySelectorAll("[data-media-entry]");

    for (const entry of entries) {
      const visible = mediaMatches(
        {
          type: entry.dataset.type,
          status: entry.dataset.status,
          recommended: entry.dataset.recommended === "true",
          year: entry.dataset.year,
          byline: entry.dataset.byline,
        },
        {
          checkedTypes,
          checkedStatuses,
          recommendedOnly,
          typeFiltering,
          statusFiltering,
          yearQuery,
          bylineQuery,
        },
      );
      entry.toggleAttribute("hidden", !visible);
      if (visible) visibleCount += 1;
    }

    const emptyState = document.querySelector("[data-media-empty]");
    emptyState?.toggleAttribute("hidden", visibleCount > 0);
  }, [
    checkedTypes,
    checkedStatuses,
    recommendedOnly,
    yearQuery,
    bylineQuery,
    typeFiltering,
    statusFiltering,
  ]);

  return (
    <form className="media-filter" aria-label="Media filters" onSubmit={(event) => event.preventDefault()}>
      <FacetLine
        label="Type"
        values={types}
        checked={checkedTypes}
        setChecked={setCheckedTypes}
      />

      <FacetLine
        label="Status"
        values={statuses}
        checked={checkedStatuses}
        setChecked={setCheckedStatuses}
      />

      <div className="media-filter-details">
        <label className="media-filter-text">
          <span>Year</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            value={yearQuery}
            onChange={(event) => setYearQuery(event.target.value)}
          />
        </label>
        <label className="media-filter-text">
          <span>Byline</span>
          <input
            type="search"
            placeholder="Author, director…"
            value={bylineQuery}
            onChange={(event) => setBylineQuery(event.target.value)}
          />
        </label>
        <label className="media-filter-item media-filter-recommended">
          <input
            type="checkbox"
            checked={recommendedOnly}
            onChange={(event) => setRecommendedOnly(event.target.checked)}
          />
          <span>recommended only</span>
        </label>
      </div>
    </form>
  );
}
