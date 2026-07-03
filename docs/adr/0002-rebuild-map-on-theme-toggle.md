# Rebuild the Google Map on theme toggle

The timeline map uses AdvancedMarkerElement (the classic Marker is
deprecated), which requires a mapId — and once a map has a mapId, the inline
`styles` array for JSON theming is ignored, so dark/light theming must go
through the API's `colorScheme` option instead. `colorScheme` is fixed at map
construction, so the island watches Starlight's `data-theme` attribute with a
MutationObserver and rebuilds the map on the same canvas when it flips,
bumping an epoch counter to reattach markers and refit bounds. A full rebuild
per toggle looks heavy-handed, but it's the only supported path to a
theme-matched map with AdvancedMarkerElement.
