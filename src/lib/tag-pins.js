// Tag pins: the one pin shape and tag→icon mapping shared by the bio
// timeline rail (server-rendered in bio.astro) and the timeline map's
// markers (built client-side in TimelineMap.jsx). Both render the same SVG
// so a reader can match a rail pin to its map pin at a glance.

// Qualitative palette (Tableau-derived) — legible on both the light and dark
// theme and on map tiles. Assigned to tags by their index in the site's
// sorted tag list, so a tag keeps its color as long as the tag set is stable.
// Pins themselves render in PIN_COLOR these days; this palette survives only
// to tint the keyless map placeholder's chip dots.
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

// Monochrome stroke icon per tag (Feather-style: 24x24 viewBox, 2px stroke,
// round caps — the same line weight as the ring outline), rendered in the
// pin head. Values are SVG inner markup; color comes from the enclosing
// group, so icons stay on-palette automatically. Tags without an entry (and
// any future tag until it's added here) keep the plain punched-hole pin.
export const TAG_ICONS = {
  // briefcase
  career:
    '<rect x="2" y="7" width="20" height="14" rx="2"/>' +
    '<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  // users
  family:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
    '<circle cx="9" cy="7" r="4"/>' +
    '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
    '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  // paper plane
  travel:
    '<line x1="22" y1="2" x2="11" y2="13"/>' +
    '<polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  // heart
  hobby:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
};

export function tagIcon(tag) {
  return TAG_ICONS[tag];
}

// A tag icon as a standalone SVG (used by the map placeholder's chips).
export function iconSvg(icon, size = 14) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `width="${size}" height="${size}" fill="none" stroke="${PIN_COLOR}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true">${icon}</svg>`
  );
}

// The one color every pin and bubble uses: the timeline rail's own color
// (see --tl-rail-color in bio.css — keep the two in sync), which matches the
// .tl-month labels, so pins read as part of the rail rather than a separate
// system. A CSS variable, not a hex value: it resolves against Starlight's
// palette wherever the SVG lands (rail or map overlay) and follows the
// dark/light toggle for free.
export const PIN_COLOR = "var(--sl-color-gray-3)";

// Pin SVG. Variants:
//
// - Icon pins (tag has a TAG_ICONS entry): the tag's monochrome icon inside
//   a large, thin circle, on a theme-background disc so the icon reads over
//   map tiles and masks the rail behind it. The icon is nested as its own
//   24x24 <svg> centered in the 42px inner disc, so it renders at 24px —
//   the size the emoji glyphs settled on. On the map (`stem: true`) a thin
//   line runs from the ring's bottom to the viewBox's bottom center — the
//   AdvancedMarkerElement anchor — so it points at the exact coordinate. On
//   the timeline rail (`stem: false`) the ring stands alone, sitting on the
//   rail like a node on the line.
// - Plain pins (no icon): the original small teardrop with a punched hole,
//   tip at the bottom center.
//
// `size` is the rendered height; the stemmed ring is narrower than tall.
export function pinSvg(size = 20, glyph, stem = true) {
  const ring = (cx, cy) =>
    `<circle cx="${cx}" cy="${cy}" r="21" fill="var(--sl-color-bg, #fff)" ` +
    `stroke="${PIN_COLOR}" stroke-width="2"/>` +
    `<svg x="${cx - 12}" y="${cy - 12}" width="24" height="24" ` +
    `viewBox="0 0 24 24" fill="none" stroke="${PIN_COLOR}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>`;
  if (glyph && stem) {
    const width = Math.round((size * 48) / 72);
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 72" ` +
      `width="${width}" height="${size}" aria-hidden="true">` +
      `<line x1="24" y1="45" x2="24" y2="72" stroke="${PIN_COLOR}" stroke-width="2"/>` +
      ring(24, 24) +
      `</svg>`
    );
  }
  if (glyph) {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" ` +
      `width="${size}" height="${size}" aria-hidden="true">` +
      ring(24, 24) +
      `</svg>`
    );
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `width="${size}" height="${size}" aria-hidden="true">` +
    `<path d="M12 1.5C7.16 1.5 3.5 5.16 3.5 10c0 2.92 1.71 5.97 3.52 8.32a29.6 29.6 0 0 0 4.16 4.38 1.24 1.24 0 0 0 1.64 0 29.6 29.6 0 0 0 4.16-4.38C18.79 15.97 20.5 12.92 20.5 10c0-4.84-3.66-8.5-8.5-8.5Z" ` +
    `fill="${PIN_COLOR}" stroke="rgba(0, 0, 0, 0.35)" stroke-width="1"/>` +
    `<circle cx="12" cy="10" r="3.2" fill="var(--sl-color-bg, #fff)"/>` +
    `</svg>`
  );
}
