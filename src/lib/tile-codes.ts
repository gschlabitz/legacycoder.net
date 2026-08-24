// Per-sheet map codes for the plant-calendar tile maps. Every cell in a
// map grid is TWO editor columns wide: either one emoji (double-width in
// monospace) or a two-character ASCII code — so ASCII and emoji rows line
// up visually, and related tiles group as families (s1–s6 snow, f1–f9
// fence). `..` (or any mix of dots/spaces) is the empty cell.
//
// Three ways to address a tile, resolved in this order by TileMonth:
//   1. per-file `alias: X=sheet:tile` bindings,
//   2. the active sheet's semantic codes below (letter-first; emoji
//      preferred where a tile resembles one),
//   3. the universal numeric code: the tile index in base36, two digits,
//      digit-first (`00`…`3n` on a 132-tile sheet) — every tile of every
//      sheet is always addressable, no curation required.
// The code space restarts per sheet — 🌲/t1 is a tree in every sheet that
// has trees. The playground charts show each tile's code.
import sheets from '../data/tilesheets.json';

export const semantic: Record<string, Record<string, number>> = {
  'tiny-ski': {
    // snow ground: s0 base, s1–s6 sparkle variants
    s0: 13, s1: 0, s2: 1, s3: 2, s4: 3, s5: 4, s6: 5,
    // trees & wood
    '🌲': 6, t1: 6, // snowy pine, tall
    '🎄': 30, t2: 30, // snowy pine
    '🌳': 18, t3: 18, // green tree with snow
    t4: 7, // bare shrub, snowy
    '🪵': 19, t5: 19, // snowy trunk
    t6: 31, // fallen twigs
    t7: 47, // tree stump
    '🪨': 81, r1: 81, // snowed-in rock
    // weather
    w1: 58, // icicles
    w2: 59, // falling snow
    // figures
    '⛄': 69, m1: 69, // snowman
    '👾': 78, m2: 78, // snow golem
    m3: 79, // snow golem, mid
    '👹': 80, m4: 80, // snow golem, red-eyed
    '🎿': 70, k1: 70, // skier
    '🏂': 82, k2: 82, // skier, blue
    k3: 71, k4: 83, // skier variants
    // flags, gates, banners
    '🚩': 8, f1: 8, f2: 20, // red flags
    f3: 9, f4: 21, // blue flags
    '🏁': 10, g1: 10, g2: 11, // mesh gates
    g3: 22, g4: 23, // blue chevron banner
    g5: 32, g6: 33, // chevron flags
    g7: 34, g8: 35, // red chevron banner
    // chairlift & sled
    l1: 41, l2: 42, l3: 43, l4: 44, l5: 45, l6: 46,
    l7: 53, l8: 54,
    '🚠': 55, l9: 55, '🚟': 56, la: 56, '🚡': 57, lb: 57,
    '🛷': 67, v1: 67, v2: 68, v3: 66, // sled & pole
  },
  'tiny-town': {
    // grass & dirt
    g1: 0, // grass, speckled
    g2: 1, // grass, plain
    '🌼': 2, g3: 2, // grass with flowers
    d1: 12, d2: 13, d3: 14, // dirt patch: top row
    d4: 24, d5: 25, d6: 26, // dirt patch: middle row (d5 = pure center)
    d7: 36, d8: 37, d9: 38, // dirt patch: bottom row
    b1: 39, b2: 40, b3: 41, b4: 42, // dirt–grass blends
    '🪨': 43, b5: 43, // stepping stones on grass
    // trees
    '🌳': 5, t1: 5, // big leafy tree
    t2: 4, // green poplar, tall
    t3: 16, // green poplar
    t4: 28, // green poplar, small
    o1: 3, o2: 15, o3: 27, // orange poplars
    '🌲': 19, p1: 19, // pine with trunk
    p2: 6, p3: 7, p4: 8, p5: 18, p6: 20, p7: 30, p8: 31, p9: 32, // pine groups
    a1: 9, '🍁': 10, a2: 10, a3: 11, // orange pines
    a4: 21, a5: 22, a6: 23,
    a7: 33, '🍂': 34, a8: 34, a9: 35,
    // small flora
    '🌿': 17, h1: 17, // fern sprout
    '🍄': 29, h2: 29, // red mushrooms
    // fence enclosure (f1–f8 clockwise box, f9/fa/fb posts, fc–fe run)
    f1: 44, f2: 45, f3: 46, // top-left, top, top-right
    f4: 56, f5: 58, // left, right
    f6: 68, f7: 69, f8: 70, // bottom-left, bottom, bottom-right
    f9: 47, fa: 59, fb: 71, // standalone posts
    fc: 80, fd: 81, fe: 82, // horizontal fence run
    // stone patio slabs (standalone; the bubble panel is a 9-patch)
    q1: 96, q2: 97, q3: 98,
    q4: 108, '⬜': 109, q5: 109, q6: 110,
    q7: 120, q8: 121, q9: 122,
    // props & tools
    '🪧': 83, // wooden sign
    '📦': 103, // crate
    '🏺': 107, // clay pot
    '🐝': 94, // beehive
    '🪙': 93, // coin
    '🤠': 92, // gardener (head — stack over 🧑)
    '🧑': 104, // gardener (body with bucket)
    '🔱': 116, // pitchfork
    '🪓': 127, // axe
    '🔨': 128, // hammer
    '🧺': 130, // basket
    '🧰': 131, // toolbox
  },
  'tiny-farm': {
    // soil beds: b1–b4 horizontal, b5–b7 vertical, b8/b9 mounds, ba–bc wet
    b1: 48, b2: 49, b3: 50, b4: 51,
    b5: 12, b6: 24, b7: 36,
    b8: 0, b9: 1,
    ba: 13, bb: 25, bc: 37,
    // crop growth stages, seed → harvest (x1…x5 per crop)
    c1: 4, '🌱': 5, c2: 5, c3: 6, c4: 7, '🥕': 8, c5: 8, // carrot
    u1: 16, u2: 17, u3: 18, u4: 19, '🍆': 20, u5: 20, // turnip
    n1: 28, n2: 29, n3: 30, n4: 31, '🌽': 32, n5: 32, // corn
    o1: 40, o2: 41, o3: 42, o4: 43, '🍅': 44, o5: 44, // tomato (o4 = vine debris)
    a1: 52, a2: 53, a3: 54, a4: 55, '🥬': 56, a5: 56, // cabbage
    w1: 64, w2: 65, w3: 66, w4: 67, '🌾': 68, w5: 68, // wheat
    '🌻': 83, f1: 83, // sunflower
    '🍎': 78, f2: 78, // apple bush
    '🌿': 80, f3: 80, // grass tuft
    f4: 81, // planted mound
    // trees & wood
    '🌲': 15, t1: 15, // pine
    '🎄': 3, t2: 3, // pine, snow-dusted
    t3: 27, // pine, small
    '🌳': 39, t4: 39, // round bush
    '🪵': 2, t5: 2, t6: 14, t7: 26, t8: 38, // trunks & branches
    '🪨': 77, r1: 77, // stones
    r2: 89, // stone pile
    // props & tools
    k1: 33, // corn seed sack
    '📦': 76, k2: 76, // crate
    p1: 72, // empty bucket
    '💧': 73, p2: 73, // water bucket
    '🪣': 124, p3: 124, // bucket with handle
    '🚿': 84, p4: 84, // watering can
    p5: 85, // barrel
    '🥛': 123, p6: 123, // milk can
    '🥚': 125, p7: 125, // egg
    h1: 96, h2: 97, // hay bales
    // animals & people
    '🐄': 121, z1: 121, // cow
    '🐑': 120, z2: 120, // sheep
    '🐔': 122, z3: 122, // chicken
    '🧑': 108, z4: 108, // farmer
    '🤠': 109, z5: 109, // farmer with hat
  },
};

export function tileCount(sheet: string): number {
  const meta = sheets.find((s) => s.name === sheet);
  if (!meta) {
    throw new Error(`tile-codes: unknown sheet "${sheet}" — registered: ${sheets.map((s) => s.name).join(', ')}`);
  }
  return meta.cols * meta.rows;
}

export function sheetCodes(sheet: string): Record<string, number> {
  tileCount(sheet); // validates the sheet name
  return semantic[sheet] ?? {};
}

// The universal numeric code: tile index in base36, two digits,
// digit-first — distinct from letter-first semantic codes by construction.
export function numericCode(tile: number): string {
  return tile.toString(36).padStart(2, '0');
}

export function parseNumericCode(code: string, sheet: string): number | undefined {
  if (!/^[0-9][0-9a-z]$/.test(code)) return undefined;
  const tile = parseInt(code, 36);
  return tile < tileCount(sheet) ? tile : undefined;
}

// Display code for the playground charts: emoji beat letter codes beat
// the numeric fallback.
const reverseCache = new Map<string, Map<number, string>>();
export function codeOf(sheet: string, tile: number): string {
  let rev = reverseCache.get(sheet);
  if (!rev) {
    rev = new Map();
    const entries = Object.entries(sheetCodes(sheet)).sort(
      (a, b) => (a[0].codePointAt(0)! > 0x2000 ? 1 : 0) - (b[0].codePointAt(0)! > 0x2000 ? 1 : 0),
    );
    for (const [ch, i] of entries) rev.set(i, ch);
    reverseCache.set(sheet, rev);
  }
  return rev.get(tile) ?? numericCode(tile);
}
