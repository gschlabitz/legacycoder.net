// Tag pins: the one pin shape and tag→color mapping shared by the bio
// timeline rail (server-rendered in bio.astro) and the timeline map's
// markers (built client-side in TimelineMap.jsx). Both render the same SVG
// so a reader can match a rail pin to its map pin by color at a glance.

// Qualitative palette (Tableau-derived) — legible on both the light and dark
// theme and on map tiles. Assigned to tags by their index in the site's
// sorted tag list, so a tag keeps its color as long as the tag set is stable.
export const PIN_PALETTE = [
  "#e15759", // red
  "#4e79a7", // blue
  "#f28e2b", // orange
  "#59a14f", // green
  "#b07aa1", // mauve
  "#76b7b2", // teal
  "#edc949", // yellow
  "#ff9da7", // pink
  "#9c755f", // brown
  "#86bcb6", // seafoam
  "#d37295", // rose
  "#a0cbe8", // sky
];

// Fallback for events with no tags (schema allows an empty list).
export const PIN_FALLBACK = "#9aa0a6";

export function tagColor(tag, allTags) {
  const i = allTags.indexOf(tag);
  return i < 0 ? PIN_FALLBACK : PIN_PALETTE[i % PIN_PALETTE.length];
}

// Glyph emoji per tag, rendered in the pin head. Tags without an entry (and
// any future tag until it's added here) keep the plain punched-hole pin.
export const TAG_GLYPHS = {
  acquisition: "🤝",
  career: "💼",
  contract: "📝",
  family: "👪",
  freelance: "🧑‍💻",
  home: "🏠",
  internship: "🌱",
  move: "🚚",
  teaching: "🧑‍🏫",
  travel: "✈️",
};

export function tagGlyph(tag) {
  return TAG_GLYPHS[tag];
}

// Teardrop pin, tip at the bottom center of the viewBox — the natural anchor
// both for AdvancedMarkerElement content (anchored bottom-center on the
// coordinate) and for planting the tip on the timeline rail. The head picks
// up the theme background: as a small punched hole on plain pins, or as a
// larger disc hosting the tag's glyph emoji — neutral ground, so the glyph
// doesn't clash with the pin color behind it.
export function pinSvg(color, size = 20, glyph) {
  const head = glyph
    ? `<circle cx="12" cy="10" r="6.2" fill="var(--sl-color-bg, #fff)"/>` +
      `<text x="12" y="10" text-anchor="middle" dominant-baseline="central" ` +
      `font-size="8.5">${glyph}</text>`
    : `<circle cx="12" cy="10" r="3.2" fill="var(--sl-color-bg, #fff)"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `width="${size}" height="${size}" aria-hidden="true">` +
    `<path d="M12 1.5C7.16 1.5 3.5 5.16 3.5 10c0 2.92 1.71 5.97 3.52 8.32a29.6 29.6 0 0 0 4.16 4.38 1.24 1.24 0 0 0 1.64 0 29.6 29.6 0 0 0 4.16-4.38C18.79 15.97 20.5 12.92 20.5 10c0-4.84-3.66-8.5-8.5-8.5Z" ` +
    `fill="${color}" stroke="rgba(0, 0, 0, 0.35)" stroke-width="1"/>` +
    head +
    `</svg>`
  );
}
