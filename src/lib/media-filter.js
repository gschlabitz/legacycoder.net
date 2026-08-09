export function queryValues(search, name, allowed) {
  return new URLSearchParams(search)
    .getAll(name)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => allowed.includes(value));
}

export function queryText(search, name) {
  return new URLSearchParams(search).get(name)?.trim() ?? '';
}

export function facetState(selectedCount, totalCount) {
  return {
    checked: totalCount > 0 && selectedCount === totalCount,
    indeterminate: selectedCount > 0 && selectedCount < totalCount,
  };
}

export function mediaMatches(
  media,
  {
    checkedTypes,
    checkedStatuses,
    recommendedOnly,
    typeFiltering,
    statusFiltering,
    yearQuery = '',
    bylineQuery = '',
  },
) {
  const typeMatches = !typeFiltering || checkedTypes.has(media.type);
  const statusMatches = !statusFiltering || checkedStatuses.has(media.status);
  const recommendationMatches = !recommendedOnly || media.recommended;
  const yearMatches = !yearQuery.trim() || String(media.year ?? '') === yearQuery.trim();
  const bylineMatches = !bylineQuery.trim()
    || String(media.byline ?? '').toLowerCase().includes(bylineQuery.trim().toLowerCase());
  return typeMatches
    && statusMatches
    && recommendationMatches
    && yearMatches
    && bylineMatches;
}
