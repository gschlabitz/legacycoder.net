export function queryValues(search, name, allowed) {
  return new URLSearchParams(search)
    .getAll(name)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => allowed.includes(value));
}

export function mediaMatches(
  media,
  { checkedTypes, checkedStatuses, recommendedOnly, typeFiltering, statusFiltering },
) {
  const typeMatches = !typeFiltering || checkedTypes.has(media.type);
  const statusMatches = !statusFiltering || checkedStatuses.has(media.status);
  const recommendationMatches = !recommendedOnly || media.recommended;
  return typeMatches && statusMatches && recommendationMatches;
}
