// Historillion, 2D kit v14: the excavation field (used by dig-scene.js). All art is drawn here in code from the channel palette, in STAGE coordinates
// (the stage of dig-scene.js: its origin is picture (228, 146)).
//
// The view is a 3/4 view from the front: you look into a trench dug into the ground (x 34 to 128, back edge y 40), with earthen walls. Its BACK wall is
// the dig: it gets taller with every point, one horizontal band of earth per era (young at the top, old at the bottom, the newest band appears at the
// bottom), with recognisable pieces in each. In front of it you see a strip of plain earth floor where he works; he, his machines and the find go down
// with it. The ground in front of the trench and beside it (with the camp: tent, find table, spoil heap) is drawn on top (drawFront).
//
// Exports: ERAS, eraIndex, eraAt, zOf, frontY, actorOffset, drawSite, drawTrench, drawFront, itemCanvas, tagCanvas, ITEM_NAMES, SITE, VIEW, SLOT_X, SLOT_ROW, TABLE_Y, TR, eraTagX, eraTagY.

// ---- the eras: soil layers from young (top) to old; `from` in points (0 to 100 a question, 7 questions); one in 100 players reaches the tomb ----
export const ERAS = [
  { from: 0, name: "Modern", years: "1800 to now" },
  { from: 80, name: "Early modern", years: "1500 to 1800" },
  { from: 160, name: "Medieval", years: "500 to 1500" },
  { from: 230, name: "Roman & Classical", years: "800 BC to AD 500" },
  { from: 300, name: "Bronze & Iron Age", years: "3300 to 800 BC" },
  { from: 360, name: "Stone Age", years: "before 3300 BC" },
  { from: 420, name: "One in a Historillion", years: "The hidden golden tomb", tag: "Golden tomb" },
];
export const eraIndex = (p) => { let i = 0; while (i + 1 < ERAS.length && p >= ERAS[i + 1].from) i++; return i; };
export const eraAt = (p) => ERAS[eraIndex(Math.max(0, p))];

// ---- the channel palette (palette.json) ----
const OUT = "#0e0a18";
const night = ["#0a0c22", "#121234", "#1e1846", "#2e1e56", "#442662", "#5c3068"];
const stone = ["#28223a", "#3e3652", "#5c5270", "#827a96", "#b0aabe", "#dcd8e2"];
const wood = ["#2c1822", "#482626", "#683a2c", "#8e5434", "#b87a44", "#dea662"];
const brick = ["#3a1426", "#62202e", "#962c34", "#cc3e3c", "#ec6e5a", "#faaa8c"];
const gold = ["#482822", "#8c541c", "#ce8c24", "#ffd038", "#ffee96", "#fffade"];
const paper = ["#5a464a", "#8c7468", "#bea880", "#dcc89c", "#f4e6ba", "#faf6eb"];
const leaf = ["#14282e", "#1e423a", "#2e6240", "#4e8446", "#7eaa54", "#bace78"];
const teal = ["#18283a", "#223e4c", "#30585e", "#467670", "#689686", "#96baa2"];

// the earth of each layer: natural soil tones (base, dark, light), young to old; the floor is plain earth
// dark brown, red-brown, grey, ochre, sand yellow, dark grey, gold: each layer clearly its own earth
const SOIL = [[wood[1], wood[0], wood[2]], [wood[3], wood[2], wood[4]], [paper[1], paper[0], paper[2]], [wood[4], wood[3], wood[5]], [paper[3], paper[2], paper[4]], [stone[2], stone[1], stone[3]], [gold[2], gold[1], gold[3]]];
const FLOOR = [wood[2], wood[1], wood[3]];

// ---- geometry (stage px) ----
// The trench is dug INTO the ground: earthen side walls x 34 and 128, the back edge at y 40. Its back wall gets taller as you dig (z px), and you always see a
// strip of floor (FV px) in front of it, where he works; the front edge is below that strip.
export const TR = { x0: 34, x1: 128, back: 40 };
const FV = 30;                                                     // the strip of floor you see in front of the back wall
const INSET = 0.12;                                                // the side walls lean in: the back wall is this much narrower per px of depth (you look down into a hole)
const KD = 0.3;                                                    // px of back wall per point: 420 points = 126 px of wall
export const zOf = (p) => Math.round(KD * Math.min(Math.max(0, p), 480));   // how high the back wall is after p points (the tomb counts 60 points)
const zFrom = (i) => Math.round(KD * ERAS[i].from);
export const frontY = (p) => TR.back + zOf(p) + FV;               // the front edge of the trench for p points
// the archaeologist's dig spot on the floor: his digging rows have their feet at (78, 84) in dig-scene.js; the actors are moved by this offset
const DIG = { x: 66, dy: 18 };
export const actorOffset = (p) => [DIG.x - 78, TR.back + zOf(p) + DIG.dy - 84];
// the actors are drawn smaller than the field (scale k about his feet, actor point 78, 84), so he is about one layer high: actor point -> stage point
export const actorToStage = (p, k, x, y) => { const [ax, ay] = actorOffset(p); return [ax + 78 + (x - 78) * k, ay + 84 + (y - 84) * k]; };
export const eraTagY = (i) => TR.back + zFrom(i) + 2;            // where a layer's name goes: small, by its band, at the right end of the wall
export const eraTagX = () => TR.x1 - 5;
export const SITE = { x0: -80, y0: -60, w: 380, h: 320 };          // the canvases of the field (stage x -80 to 300, y -60 to 260)
export const VIEW = { top: 4 };                                  // the first stage row the camera shows (the tent and the table); the last is frontY + 14
export const TABLE_Y = 40;                                        // the top of the find table, beside the tent (right of the trench); the day's finds stand on it
export const SLOT_X = [142, 157, 172, 187, 149, 164, 179];         // 7 places side by side: 4 at the back of the table, 3 in front, each with a small tag under it
export const SLOT_ROW = [0, 0, 0, 0, 1, 1, 1];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h >>> 8) / 16777216; };
function pen(g, ox = 0, oy = 0) {                                 // flat blocks in stage coordinates (ox, oy: the canvas's stage position)
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x - ox), Math.round(y - oy), Math.round(w), Math.round(h)); };
  const dith = (x, y, w, h, c, o = 0) => { g.fillStyle = c; for (let j = 0; j < h; j++) for (let i = (j + o) & 1; i < w; i += 2) g.fillRect(Math.round(x - ox) + i, Math.round(y - oy) + j, 1, 1); };
  const box = (x, y, w, h, c) => { px(x - 1, y - 1, w + 2, h + 2, OUT); px(x, y, w, h, c); };
  const disc = (cx, cy, r, c, sy = 1) => { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); px(cx - w, cy + Math.round(y * sy), 2 * w + 1, Math.max(1, Math.round(sy)), c); } };
  const mound = (cx, base, hw, h, c, d, l) => {                 // a low, uneven heap of dug earth: a ragged top, lit on the left, in shade on the right
    for (let x = -hw; x <= hw; x++) {
      const u = x / hw, top = Math.round(h * (1 - u * u) * (0.75 + 0.25 * Math.sin(x * 0.9 + cx)) + (hash(cx + x, base) < 0.3 ? 1 : 0));
      if (top <= 0) continue;
      px(cx + x, base - top - 1, 1, 1, OUT); px(cx + x, base - top, 1, top, x < 0 ? c : d); px(cx + x, base - top, 1, 1, l);
    }
    px(cx - hw, base, 2 * hw + 1, 1, d);
  };
  const sprite = (x, y, rows, map) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) px(x + i, y + j, 1, 1, map[ch]); }));
  return { px, dith, box, disc, mound, sprite };
}
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111"];
function digit(p, x, y, n, c) { [...DIGITS[n]].forEach((b, i) => { if (b === "1") p.px(x + (i % 3), y + Math.floor(i / 3), 1, 1, c); }); }

// ---- the finds: one thing per era (12 x 12, o = outline), "none" turns up a plain rock ----
const ITEMS = [
  { map: { o: OUT, g: gold[3], h: gold[4], d: gold[1], p: paper[5], k: OUT }, rows: ["....oooo....", "....ohgo....", "..oooooooo..", ".oghhhhhhgo.", "ogpppkppppgo", "ogpppkppppgo", "ogpppkkkppgo", "ogppppppppgo", "ogppppppppgo", ".odppppppdo.", "..oddddddo..", "...oooooo..."] },   // pocket watch
  { map: { o: OUT, g: gold[2], h: gold[3], p: paper[4], r: brick[3], k: stone[1] }, rows: ["...oooooo...", "..ohhhhhhoo.", ".ohpppppphgo", "ohppppprpphg", "ohpppprrpphg", "ohppppkpppgo", "ohpppkkppphg", "ohppkpppppgo", ".ogpppppphgo", "..ogggggggo.", "...oooooo...", "............"] },   // brass compass
  { map: { o: OUT, s: stone[4], w: stone[5], g: gold[2], h: gold[3], b: wood[2] }, rows: ["..........oo", ".........oso", "........oswo", ".......oswo.", "......oswo..", ".....oswo...", "..o.oswo....", "..ohoswo....", "...ohho.....", "..obohho....", ".obo..oho...", "oo.........."] },   // knight's sword
  { map: { o: OUT, g: gold[2], h: gold[3], w: gold[4], k: gold[1] }, rows: ["............", "...oooooo...", "..ohhhhhho..", ".ohhwwhhhgo.", ".ohwhhhhhgo.", ".ohhhkkhhgo.", ".ohhkhhkhgo.", ".ohhhkkhhgo.", ".ohhhhhhhgo.", "..oggggggo..", "...oooooo...", "............"] },   // Roman coin
  { map: { o: OUT, g: gold[2], h: gold[3], k: gold[1], b: wood[2], c: wood[3] }, rows: ["............", "....oooo....", "...ohhhgo...", "..ohhhhkgo..", "..ohhgggko..", "...oooocbo..", ".......obco.", "........obco", ".........obo", "..........oo", "............", "............"] },   // bronze axe
  { map: { o: OUT, s: stone[3], l: stone[4], d: stone[2] }, rows: ["....oo......", "...olso.....", "...olsso....", "..olssdso...", "..olsdssso..", ".olssssdso..", ".olsdsssso..", ".osssssdso..", "..osdsssso..", "..odssddo...", "...oooooo...", "............"] },   // flint hand axe
  { map: { o: OUT, g: gold[3], h: gold[4], d: gold[2], k: OUT, w: gold[5] }, rows: ["...oooooo...", "..ohhhhhhgo.", ".ohhwhhhhhgo", ".ohhhhhhhhgo", ".ohkkhhkkhgo", ".ohhhhhhhhgo", ".ohhhhdhhhgo", "..ohhhhhhgo.", "..ohhkkhhgo.", "...ohhhhgo..", "....oddoo...", ".....oo....."] },   // golden mask
];
const ROCK = { map: { o: OUT, s: stone[2], l: stone[3], d: stone[1] }, rows: ["............", "............", "............", "............", "....oooo....", "..oollsso...", ".olllsssdo..", ".olssssddo..", "ossssssddso.", "osssddddddo.", ".oooooooooo.", "............"] };
export const ITEM_NAMES = ["Pocket watch", "Brass compass", "Knight's sword", "Roman coin", "Bronze axe", "Flint hand axe", "Golden mask"];
export function itemCanvas(era) {
  const c = document.createElement("canvas");
  c.width = c.height = 12;
  const it = era === "none" ? ROCK : ITEMS[Math.min(Math.max(era, 0), ITEMS.length - 1)];
  pen(c.getContext("2d")).sprite(0, 0, it.rows, it.map);
  return c;
}
// a small white find tag with its number (as on a real dig); gold edge for a rare find
export function tagCanvas(n, goldEdge = false) {               // a small white tag (5 x 7, smaller than the find) with its number; a gold dot for a rare find
  const c = document.createElement("canvas");
  c.width = 5; c.height = 7;
  const p = pen(c.getContext("2d"));
  p.px(0, 0, 5, 7, paper[5]);
  digit(p, 1, 1, n % 10, OUT);
  if (goldEdge) p.px(4, 0, 1, 1, gold[3]);
  return c;
}

// bare, dry, sandy ground: a ragged dithered edge into the meadow (grass and trees stay round it for contrast); `inside(x, y)` limits where it is painted
function sand(p, inside = () => true) {
  const cx = 90, cy = 80, rx = 196, ry = 150;
  for (let y = SITE.y0; y < SITE.y0 + SITE.h; y++) for (let x = SITE.x0; x < SITE.x0 + SITE.w; x++) {
    if (!inside(x, y)) continue;
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + 0.07 * Math.sin(x / 7 + y / 11) + 0.05 * Math.sin(y / 5 - x / 13);
    const h = hash(x, y);
    if (d < 0.88) p.px(x, y, 1, 1, h < 0.012 ? paper[1] : h < 0.03 ? wood[4] : h < 0.07 ? paper[3] : paper[2]);   // calm sand: a few grains, not noise
    else if (d < 1 && (x + y) % 2 === 0) p.px(x, y, 1, 1, paper[2]);
  }
}
function pebbles(p, r, x0, y0, w, h, n) { for (let i = 0; i < n; i++) { const x = x0 + Math.floor(r() * w), y = y0 + Math.floor(r() * h); p.px(x, y, 2, 1, stone[3]); p.px(x, y + 1, 2, 1, stone[1]); } }

// ---- the field behind the trench: sand, the ruins (drawn once) ----
export function drawSite(cv) {
  cv.width = SITE.w; cv.height = SITE.h;
  const p = pen(cv.getContext("2d"), SITE.x0, SITE.y0);
  const r = rng(14);
  sand(p);
  pebbles(p, r, SITE.x0 + 30, SITE.y0 + 30, SITE.w - 60, SITE.h - 60, 24);
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, x = Math.round(90 + Math.cos(a) * (186 + r() * 14)), y = Math.round(80 + Math.sin(a) * (142 + r() * 12)); p.px(x, y, 1, 2, leaf[3]); p.px(x + 1, y + 1, 1, 1, leaf[4]); }   // tufts at the edge
  // ruins behind the trench, on the left: a curved dry-stone wall and T-shaped standing stones, half dug out
  for (let x = -66; x < 30; x += 5) { const y = -26 + Math.round(((x + 18) / 48) ** 2 * 10); p.box(x, y, 4, 3, (x / 5) % 2 ? stone[3] : stone[2]); p.box(x + 2, y - 4, 4, 3, stone[3]); }
  for (const [x, h] of [[-50, 28], [-24, 34], [4, 26]]) {
    p.box(x, 2 - h, 8, h, paper[3]); p.px(x + 6, 2 - h, 2, h, paper[2]); p.box(x - 4, -2 - h, 16, 5, paper[4]); p.px(x - 4, 2 - h, 16, 1, paper[2]);
    p.px(x - 3, 2, 14, 2, wood[4]); p.dith(x - 3, 2, 14, 2, paper[1]);
  }
  p.box(40, -14, 7, 22, paper[3]); p.px(40, -14, 7, 2, paper[4]); p.px(39, -16, 9, 2, paper[2]); p.box(56, 2, 14, 5, paper[3]); p.px(56, 2, 14, 1, paper[4]);   // a column stump and a fallen drum
}

// recognisable pieces in each layer, big enough to read on a phone (x, y: top left; about 6 to 9 px)
function bit(p, era, k, x, y) {
  const v = k % 2;
  switch (era) {
    case 0: if (v) { p.box(x, y, 7, 3, brick[3]); p.px(x, y, 7, 1, brick[4]); p.px(x + 3, y, 1, 3, brick[1]); }                                      // a brick
      else { p.box(x, y, 3, 6, teal[4]); p.px(x + 1, y - 1, 1, 1, teal[4]); p.px(x, y + 1, 1, 3, teal[5]); } break;                                    // a glass bottle
    case 1: p.box(x, y, 5, 4, paper[4]); p.px(x + 1, y + 1, 3, 2, wood[1]); p.px(x + 5, y + 3, 4, 1, paper[4]); p.px(x + 5, y + 2, 4, 1, OUT); break;   // a clay pipe
    case 2: for (let i = 0; i < 8; i++) p.px(x + i, y + (i > 1 && i < 6 ? 0 : 1), 1, 3, i % 4 === 0 ? brick[1] : brick[2]); p.px(x, y + 4, 8, 1, OUT); break;   // a curved roof tile
    case 3: if (v) { const c = [paper[4], brick[3], teal[3], gold[3]]; p.px(x - 1, y - 1, 7, 7, OUT); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) p.px(x + i, y + j, 1, 1, c[(i + j * 2) % 4]); }   // mosaic
      else { p.box(x, y, 7, 4, brick[3]); p.px(x, y, 7, 1, brick[4]); p.px(x + 6, y - 3, 1, 3, brick[3]); p.px(x + 4, y - 3, 3, 1, brick[3]); } break;   // an amphora shard with its handle
    case 4: p.box(x, y, 6, 3, teal[3]); p.px(x + 1, y + 1, 4, 1, teal[4]); p.px(x + 4, y, 2, 1, gold[2]); break;                                     // bronze, green with age
    case 5: if (v) { p.box(x, y, 5, 4, stone[4]); p.px(x + 1, y + 1, 2, 2, stone[3]); p.px(x + 4, y + 3, 1, 1, stone[5]); }                       // flint
      else { p.px(x, y + 1, 9, 1, paper[5]); p.px(x - 1, y, 2, 3, paper[5]); p.px(x + 8, y, 2, 3, paper[5]); p.px(x, y + 2, 9, 1, paper[3]); } break;   // a bone
    default: p.box(x, y, 3, 3, gold[3]); p.px(x, y, 1, 1, gold[5]); p.box(x + 5, y + 1, 2, 2, gold[4]);                                                // gold
  }
}

// ---- the trench for a depth (points), seen as a hole in the field: the back wall with its layers runs down from the far edge, the side walls lean in,
// the floor is plain earth; a shadow under each edge; finds still in the ground, a ladder and two props ----
export function drawTrench(cv, points, { breaking = false } = {}) {
  cv.width = SITE.w; cv.height = SITE.h;
  const p = pen(cv.getContext("2d"), SITE.x0, SITE.y0);
  const { x0, x1, back } = TR;
  const z = zOf(points), fy = back + z, front = fy + FV;
  const here = eraIndex(points);
  const eraOfDepth = (d) => { let i = 0; while (i + 1 < ERAS.length && d >= zFrom(i + 1)) i++; return i; };
  const inset = (y) => (y <= fy ? INSET * (y - back) : INSET * z * (1 - (0.8 * (y - fy)) / FV));   // how far the side walls lean in at this row
  for (let y = back; y < front + 3; y++) {
    const ins = Math.round(inset(y)), d = Math.min(y - back, z), e = eraOfDepth(d), [b, dk, l] = SOIL[e];
    for (let x = x0; x < x1; x++) {
      const h = hash(x, y);
      const side = x < x0 + ins || x >= x1 - ins;
      if (y < fy) {                                               // the back wall (and the side walls in shade): horizontal bands, a wavy seam between them
        const seam = e > 0 && d - zFrom(e) <= Math.round(Math.sin(x / 7 + e) * 0.8);
        let c = seam ? dk : h < 0.07 ? dk : h < 0.12 ? l : b;
        if (side) c = (x + y) % 2 ? dk : seam ? OUT : b;          // the side walls: the same bands, darker
        p.px(x, y, 1, 1, c);
      } else if (side) p.px(x, y, 1, 1, (x + y) % 2 ? SOIL[eraOfDepth(z)][1] : FLOOR[1]);
      else p.px(x, y, 1, 1, h < 0.08 ? FLOOR[1] : h < 0.97 ? FLOOR[0] : FLOOR[2]);   // the floor: plain earth
    }
  }
  // the shadow under the far edge (the top of the back wall) and along the foot of the back wall
  for (let y = back; y < Math.min(back + 6, fy); y++) p.dith(x0, y, x1 - x0, 1, OUT, y % 2);
  for (let y = back; y < Math.min(back + 2, fy); y++) p.px(x0, y, x1 - x0, 1, OUT);
  p.dith(x0, fy, x1 - x0, 2, OUT);
  if (breaking) { p.px(x0 + 10, fy - 2, x1 - x0 - 20, 2, gold[5]); p.dith(x0 + 10, fy - 6, x1 - x0 - 20, 4, gold[4]); }
  // recognisable pieces in each band (only in the part of the wall facing you)
  for (let i = 0; i <= here; i++) {
    const d0 = zFrom(i), d1 = Math.min(i + 1 < ERAS.length ? zFrom(i + 1) : z, z);
    if (d1 - d0 < 8) continue;
    for (let k = 0; k < 3; k++) {
      const d = d0 + 3 + Math.floor(hash(k, i + 9) * Math.max(1, d1 - d0 - 9)), ins = INSET * d;
      bit(p, i, k, Math.round(x0 + ins + 6 + ((k * 31 + i * 13) % Math.max(1, x1 - x0 - 2 * ins - 40))), back + d);
    }
  }
  // old finds: a pot in a band, and a skull and a bone on the floor, each with a small white tag
  const deco = (kind, x, y) => {
    if (kind === 0) { p.box(x, y, 7, 6, brick[3]); p.px(x + 1, y - 2, 5, 1, brick[3]); p.px(x, y, 7, 1, brick[4]); }
    else if (kind === 1) { p.box(x, y, 7, 6, paper[4]); p.px(x + 1, y + 2, 2, 2, OUT); p.px(x + 4, y + 2, 2, 2, OUT); p.px(x + 2, y + 6, 3, 1, paper[3]); }
    else { p.px(x, y + 1, 9, 1, paper[5]); p.px(x - 1, y, 2, 3, paper[5]); p.px(x + 8, y, 2, 3, paper[5]); }
    p.px(x + 9, y - 3, 4, 3, paper[5]); p.px(x + 8, y - 2, 1, 1, OUT);
  };
  if (here >= 1 && zFrom(1) > 12) deco(0, Math.round(x1 - 30 - INSET * 10), back + 8);
  if (z > 8) { deco(1, x0 + Math.round(INSET * z) + 34, fy + 12); deco(2, x0 + Math.round(INSET * z) + 50, fy + 20); }
  // the golden tomb: once he is in it, a gold sarcophagus with a mask comes out of the foot of the wall
  if (here === ERAS.length - 1) { const sx = Math.round(x0 + INSET * z) + 4, sy = fy - 9; p.box(sx, sy, 24, 9, gold[3]); p.px(sx, sy, 24, 2, gold[4]); p.box(sx + 8, sy - 5, 8, 5, gold[3]); p.px(sx + 10, sy - 3, 1, 1, OUT); p.px(sx + 13, sy - 3, 1, 1, OUT); }
  // two props against the back wall and a ladder down at the right
  if (z > 14) {
    for (const x of [x0 + 24, x1 - 40]) { for (let d = 2; d < z; d++) p.px(x + Math.round(d * 0.2), back + d, 2, 1, d % 7 === 0 ? wood[2] : wood[3]); }
    const lx = x1 - 20;
    for (let y = back - 9; y < fy + 6; y++) { const sh = Math.round(Math.max(0, y - back) * INSET * 0.6); p.px(lx - sh, y, 1, 1, wood[2]); p.px(lx - sh + 6, y, 1, 1, wood[2]); if ((y - back) % 5 === 0) p.px(lx - sh + 1, y, 5, 1, wood[4]); }
  }
}

// ---- the ground in front of the trench and beside it, ON TOP of him (the edge hides what is below it), with the camp: the tent, the find table, the
// spoil heap, a wheelbarrow, buckets, a sieve, tools, loose planks, and the strings along the top edge ----
export function drawFront(cv, points) {
  cv.width = SITE.w; cv.height = SITE.h;
  const p = pen(cv.getContext("2d"), SITE.x0, SITE.y0);
  const r = rng(31);
  const { x0, x1, back } = TR;
  const front = frontY(points);
  const rag = (a, b) => Math.floor(hash(a, b) * 3);                 // a ragged earth edge, never a ruler line
  sand(p, (x, y) => y >= back - 1 && (y >= front + rag(x, 1) || x < x0 + rag(y, 2) || x >= x1 - rag(y, 3)));
  pebbles(p, r, x0, front + 10, x1 - x0, 40, 4);
  // the lip of the hole: a lighter crumbled edge on the sand, the earth just below it in shadow
  for (let x = x0; x < x1; x++) { const y = front + rag(x, 1); p.px(x, y - 1, 1, 1, OUT); if (hash(x, 4) < 0.4) p.px(x, y, 1, 1, paper[3]); }   // crumbs on the near edge
  for (let y = back; y < front; y++) { if (hash(y, 5) < 0.35) p.px(x0 + rag(y, 2), y, 1, 1, wood[4]); if (hash(y, 6) < 0.35) p.px(x1 - 1 - rag(y, 3), y, 1, 1, wood[4]); }
  // a thin string on small pegs along the top edge only
  for (let x = x0 - 2; x <= x1 + 2; x += 24) p.px(x - 1, back - 6, 2, 4, brick[3]);
  p.px(x0 - 2, back - 5, x1 - x0 + 4, 1, paper[4]);
  // one loose plank over the edge
  p.box(x0 + 44, back - 8, 30, 4, wood[4]); p.px(x0 + 44, back - 5, 30, 1, wood[3]);
  // the spoil heap on the left with a spade in it, a wheelbarrow in front
  p.mound(-4, back + 70, 32, 11, wood[4], wood[3], paper[3]); p.mound(-30, back + 40, 22, 8, wood[4], wood[3], paper[3]); p.mound(16, back + 92, 18, 6, wood[4], wood[3], paper[3]);
  p.px(6, back + 48, 2, 18, wood[1]); p.px(3, back + 46, 8, 2, wood[1]); p.box(4, back + 64, 6, 5, stone[3]);
  p.box(-30, front + 18, 30, 8, wood[3]); p.px(-30, front + 18, 30, 2, wood[4]); p.px(-28, front + 20, 26, 2, wood[2]); p.disc(2, front + 28, 3, OUT); p.disc(2, front + 28, 2, stone[3]); p.px(-38, front + 22, 9, 2, wood[1]);
  // the camp right of the trench: the tent with a flag, the find table beside it (trays, a clipboard; dig-scene.js puts the finds on it), a sieve, buckets
  const tri = (cx, top, base, half, c) => { for (let y = top; y < base; y++) { const w = Math.round(((y - top + 1) / (base - top)) * half); p.px(cx - w, y, 2 * w + 1, 1, c); } };
  tri(190, -2, 34, 26, OUT); tri(190, -1, 34, 25, leaf[2]); for (let y = 0; y < 34; y += 2) p.dith(190, y, 25, 1, leaf[1], 1);
  tri(190, 12, 34, 8, OUT); tri(190, 14, 34, 6, leaf[0]); p.px(189, -8, 2, 7, wood[1]); p.px(191, -8, 7, 3, brick[3]);
  const t0 = 132, t1 = 197, ty = TABLE_Y;
  p.box(t0, ty, t1 - t0, 26, paper[3]); p.px(t0, ty, t1 - t0, 1, paper[4]); p.px(t0, ty + 26, t1 - t0, 3, wood[2]); p.px(t0, ty + 29, t1 - t0, 1, OUT);
  for (const x of [t0 + 1, t1 - 3]) p.px(x, ty + 30, 2, 8, wood[1]);
  for (const row of [0, 1]) p.px(t0 + 3, ty + 7 + row * 13, t1 - t0 - 6, 1, wood[4]);   // a tray line under each row
  p.box(t1 - 7, ty + 16, 5, 7, wood[3]); p.px(t1 - 6, ty + 17, 3, 5, paper[5]);        // the clipboard
  p.box(140, 74, 20, 4, wood[3]); for (let k = 0; k < 9; k++) p.px(141 + k * 2, 75, 1, 2, stone[1]); p.px(142, 78, 1, 10, wood[1]); p.px(157, 78, 1, 10, wood[1]);   // the sieve
  for (const [x, y, c] of [[166, 82, teal[3]], [176, 86, brick[3]]]) { p.box(x, y, 7, 8, c); p.px(x + 1, y + 1, 5, 2, OUT); p.px(x + 1, y - 2, 5, 1, stone[3]); }
  p.box(x0 + 14, front + 9, 7, 2, stone[3]); p.px(x0 + 21, front + 9, 4, 1, wood[1]);   // a trowel and a brush by the front edge
  p.box(x1 - 22, front + 9, 3, 2, wood[5]); p.px(x1 - 19, front + 9, 5, 1, wood[1]);
}
