// Extract single tiles (and one 9-patch) from the packed sheets in
// public/tiles into public/tiles/single/, for CSS uses the sprite classes
// can't cover: `background-repeat` grounds and `border-image` panels need
// an image containing only the tile(s), not the whole sheet.
//
// Regions are given in tile coordinates (col, row, cols×rows) per sheet.
//
// Usage: npm run tile-extract

import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/tiles/single');
mkdirSync(outDir, { recursive: true });

// name → { sheet, tileSize, col, row, cols?, rows? }
const extracts = {
  // border-image 9-patches (slice = tileSize).
  'patio-9': { sheet: 'tiny-town', tileSize: 16, col: 0, row: 8, cols: 3, rows: 3 },
  'dirtpatch-9': { sheet: 'tiny-town', tileSize: 16, col: 0, row: 1, cols: 3, rows: 3 },
  // Center slice swapped for plain grass (t-0) — the enclosure's own
  // middle tile is too busy behind text.
  'fence-9': { sheet: 'tiny-town', tileSize: 16, col: 8, row: 3, cols: 3, rows: 3, fill: { col: 0, row: 0 } },
  'field-9': { sheet: 'farm', tileSize: 18, col: 13, row: 0, cols: 3, rows: 3 },
  'marble-9': { sheet: 'marble', tileSize: 18, col: 0, row: 3, cols: 3, rows: 3 },
  'sand-9': { sheet: 'sand', tileSize: 18, col: 0, row: 3, cols: 3, rows: 3 },
  'stone-9': { sheet: 'stone', tileSize: 18, col: 0, row: 3, cols: 3, rows: 3 },
  'rock-9': { sheet: 'rock', tileSize: 18, col: 0, row: 3, cols: 3, rows: 3 },
  // Seasonal ground tiles for background-repeat.
  grass: { sheet: 'tiny-town', tileSize: 16, col: 0, row: 0 },
  'flower-grass': { sheet: 'tiny-town', tileSize: 16, col: 2, row: 0 },
  dirt: { sheet: 'tiny-town', tileSize: 16, col: 1, row: 1 },
  snow: { sheet: 'tiny-ski', tileSize: 16, col: 1, row: 1 },
};

// Season transitions: 4×2-tile dithered strips (64×32px) mixing the
// outgoing ground (0) into the incoming one (1), for background-repeat-x
// bands at season seams. Built from the singles extracted above.
const DITHER = [
  [0, 1, 0, 0],
  [1, 0, 1, 1],
];
const transitions = {
  melt: ['snow', 'grass'], // Feb → Mar
  bloom: ['grass', 'flower-grass'], // May → Jun
  harvest: ['flower-grass', 'dirt'], // Aug → Sep
  frost: ['dirt', 'snow'], // Nov → Dec
};

for (const [name, r] of Object.entries(extracts)) {
  const src = resolve(root, `public/tiles/${r.sheet}.png`);
  const out = resolve(outDir, `${name}.png`);
  let image = sharp(src).extract({
    left: r.col * r.tileSize,
    top: r.row * r.tileSize,
    width: (r.cols ?? 1) * r.tileSize,
    height: (r.rows ?? 1) * r.tileSize,
  });
  if (r.fill) {
    // Replace the center tile of a 3×3 patch with another tile from the
    // same sheet (composited over, so it must be opaque).
    const fillTile = await sharp(src)
      .extract({ left: r.fill.col * r.tileSize, top: r.fill.row * r.tileSize, width: r.tileSize, height: r.tileSize })
      .toBuffer();
    image = sharp(await image.toBuffer()).composite([
      { input: fillTile, left: r.tileSize, top: r.tileSize },
    ]);
  }
  await image.toFile(out);
  console.log(`${name}.png ← ${r.sheet} (${r.col},${r.row})${r.fill ? ` center=(${r.fill.col},${r.fill.row})` : ''}`);
}

for (const [name, [a, b]] of Object.entries(transitions)) {
  const tiles = [resolve(outDir, `${a}.png`), resolve(outDir, `${b}.png`)];
  const composites = DITHER.flatMap((row, y) =>
    row.map((which, x) => ({ input: tiles[which], left: x * 16, top: y * 16 })),
  );
  await sharp({ create: { width: 64, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .png()
    .toFile(resolve(outDir, `${name}.png`));
  console.log(`${name}.png ← dither(${a} → ${b})`);
}
