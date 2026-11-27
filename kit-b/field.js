// Historillion, 2D kit v15: the excavation field (used by dig-scene.js). All art is drawn here in code from the channel palette, in STAGE coordinates
// (the stage of dig-scene.js: its origin is picture (228, 146)).
//
// One square per answer, as archaeologists really work: a rectangular excavation laid out with strings on pegs in 7 squares (4 at the back, 3 in front),
// seen in a 3/4 view. At the start of the day all squares are closed (sand). Each answer opens one square: the more points (0 to 100), the deeper it goes
// and the older the layer at its bottom. Inside a square you see its back wall with the layers he went through (the same earth colours and pieces as in v14)
// and the bottom layer on its floor. A square has a fixed size: depth shows as the height of the wall inside it, never a wall that keeps growing.
//
// Exports: ERAS, eraIndex, eraAt, SQ, squareAt, actorOffset, actorToStage, wallH, drawSite, drawSquares, itemCanvas, tagCanvas, ITEM_NAMES, SITE, FIELD,
// TABLE_Y, SLOT_X.

// ---- the eras, by the points of ONE answer (0 to 100); most answers give 20 to 40, 85 and up (the golden tomb) is about 1 answer in 40 ----
export const ERAS = [
  { from: 0, name: "Modern", years: "1800 to now" },
  { from: 20, name: "Early modern", years: "1500 to 1800" },
  { from: 30, name: "Medieval", years: "500 to 1500" },
  { from: 40, name: "Roman & Classical", years: "800 BC to AD 500" },
  { from: 55, name: "Bronze & Iron Age", years: "3300 to 800 BC" },
  { from: 70, name: "Stone Age", years: "before 3300 BC" },
  { from: 85, name: "One in a Historillion", years: "The hidden golden tomb", tag: "Golden tomb" },
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

// the earth of each layer: dark brown, red-brown, grey, ochre, sand yellow, dark grey, gold (base, dark, light)
const SOIL = [[wood[1], wood[0], wood[2]], [wood[3], wood[2], wood[4]], [paper[1], paper[0], paper[2]], [wood[4], wood[3], wood[5]], [paper[3], paper[2], paper[4]], [stone[2], stone[1], stone[3]], [gold[2], gold[1], gold[3]]];

// ---- geometry (stage px) ----
const W = 38, D = 48, GAP = 6;                                   // a square: 38 wide, its opening 48 deep (front to back); 6 px of baulk between squares
const KD = 0.4;                                                   // px of wall per point: 100 points = a 40 px wall (the floor strip in front never closes)
export const wallH = (p, dug = true) => (dug ? Math.max(3, Math.round(KD * Math.min(Math.max(0, p), 100))) : 0);   // "none" still scrapes 3 px
const zFrom = (i) => Math.round(KD * ERAS[i].from);
// the 7 squares in the order he digs them: 4 at the back (left to right), then 3 in front
export const SQ = [0, 1, 2, 3].map((i) => ({ x0: 20 + i * (W + GAP), back: 40 })).concat([0, 1, 2].map((i) => ({ x0: 42 + i * (W + GAP), back: 40 + D + 12 })))
  .map((q) => ({ ...q, x1: q.x0 + W, front: q.back + D }));
export const squareAt = (i) => SQ[Math.min(Math.max(i, 0), SQ.length - 1)];
export const FIELD = { x0: -20, x1: 214, top: -18, bottom: 160 };   // what the end screen shows: the camp, all 7 squares, the find table
// he stands on the baulk left of the square and digs into it; his digging rows have their feet at (78, 84) in dig-scene.js; the actors are moved by this
export const actorOffset = (i) => { const q = squareAt(i); return [q.x0 - 3 - 78, q.back + Math.round(D * 0.42) - 84]; };
// the actors are drawn at a smaller pixel size than the field (scale k about his feet, actor point 78, 84): actor point -> stage point
export const actorToStage = (i, k, x, y) => { const [ax, ay] = actorOffset(i); return [ax + 78 + (x - 78) * k, ay + 84 + (y - 84) * k]; };
export const SITE = { x0: -80, y0: -60, w: 380, h: 300 };          // the canvases of the field (stage x -80 to 300, y -60 to 240)
export const TABLE_Y = 20;                                        // the find table behind the squares, beside the tent: the day's finds stand on it in a row
export const SLOT_X = [64, 78, 92, 106, 120, 134, 148];

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

// ---- the field: sand, the ruins, the camp (tent, find table, sieve, buckets), heaps of dug earth, the strings and pegs of the 7 squares (drawn once) ----
export function drawSite(cv) {
  cv.width = SITE.w; cv.height = SITE.h;
  const p = pen(cv.getContext("2d"), SITE.x0, SITE.y0);
  const r = rng(14);
  sand(p);
  pebbles(p, r, SITE.x0 + 30, SITE.y0 + 30, SITE.w - 60, SITE.h - 60, 24);
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, x = Math.round(100 + Math.cos(a) * (190 + r() * 14)), y = Math.round(70 + Math.sin(a) * (138 + r() * 12)); p.px(x, y, 1, 2, leaf[3]); p.px(x + 1, y + 1, 1, 1, leaf[4]); }   // tufts at the edge
  // ruins behind, on the left: a curved dry-stone wall and T-shaped standing stones, half dug out
  for (let x = -70; x < 20; x += 5) { const y = -40 + Math.round(((x + 24) / 48) ** 2 * 10); p.box(x, y, 4, 3, (x / 5) % 2 ? stone[3] : stone[2]); p.box(x + 2, y - 4, 4, 3, stone[3]); }
  for (const [x, h] of [[-54, 28], [-28, 34], [-2, 26]]) {
    p.box(x, -12 - h, 8, h, paper[3]); p.px(x + 6, -12 - h, 2, h, paper[2]); p.box(x - 4, -16 - h, 16, 5, paper[4]); p.px(x - 4, -12 - h, 16, 1, paper[2]);
    p.px(x - 3, -12, 14, 2, wood[4]); p.dith(x - 3, -12, 14, 2, paper[1]);
  }
  p.box(-34, -4, 12, 5, paper[3]); p.px(-34, -4, 12, 1, paper[4]);
  // the camp behind the squares: the find table (the day's finds stand on it in a row, dig-scene.js puts them there), the tent beside it with a flag
  const t0 = 54, t1 = 160, ty = TABLE_Y;
  p.box(t0, ty, t1 - t0, 9, paper[3]); p.px(t0, ty, t1 - t0, 1, paper[4]); p.px(t0, ty + 9, t1 - t0, 3, wood[2]); p.px(t0, ty + 12, t1 - t0, 1, OUT);
  for (const x of [t0 + 1, t1 - 3]) p.px(x, ty + 13, 2, 6, wood[1]);
  p.px(t0 + 3, ty + 3, t1 - t0 - 6, 1, wood[4]);                  // the tray line
  p.box(t0 - 9, ty - 2, 6, 8, wood[3]); p.px(t0 - 8, ty - 1, 4, 6, paper[5]); p.px(t0 - 7, ty + 1, 2, 1, stone[2]); p.px(t0 - 7, ty + 3, 2, 1, stone[2]);   // the clipboard
  const tri = (cx, top, base, half, c) => { for (let y = top; y < base; y++) { const w = Math.round(((y - top + 1) / (base - top)) * half); p.px(cx - w, y, 2 * w + 1, 1, c); } };
  tri(190, -14, 26, 26, OUT); tri(190, -13, 26, 25, leaf[2]); for (let y = -12; y < 26; y += 2) p.dith(190, y, 25, 1, leaf[1], 1);
  tri(190, 2, 26, 8, OUT); tri(190, 4, 26, 6, leaf[0]); p.px(189, -20, 2, 7, wood[1]); p.px(191, -20, 7, 3, brick[3]);
  // heaps of dug earth (low and uneven), a spade, a wheelbarrow; a sieve and buckets on the right
  p.mound(-6, 92, 22, 9, wood[4], wood[3], paper[3]); p.mound(-14, 130, 18, 7, wood[4], wood[3], paper[3]); p.mound(226, 120, 18, 7, wood[4], wood[3], paper[3]);
  p.px(0, 70, 2, 18, wood[1]); p.px(-3, 68, 8, 2, wood[1]); p.box(-2, 86, 6, 5, stone[3]);
  p.box(-36, 152, 30, 8, wood[3]); p.px(-36, 152, 30, 2, wood[4]); p.px(-34, 154, 26, 2, wood[2]); p.disc(-4, 162, 3, OUT); p.disc(-4, 162, 2, stone[3]); p.px(-44, 156, 9, 2, wood[1]);
  p.box(198, 52, 20, 4, wood[3]); for (let k = 0; k < 9; k++) p.px(199 + k * 2, 53, 1, 2, stone[1]); p.px(200, 56, 1, 10, wood[1]); p.px(215, 56, 1, 10, wood[1]);
  for (const [x, y, c] of [[200, 78, teal[3]], [208, 84, brick[3]]]) { p.box(x, y, 7, 8, c); p.px(x + 1, y + 1, 5, 2, OUT); p.px(x + 1, y - 2, 5, 1, stone[3]); }
  // the excavation: a slightly darker, raked rectangle round the squares, its string on pegs round every square
  const ex0 = SQ[0].x0 - 4, ex1 = SQ[3].x1 + 4, ey0 = SQ[0].back - 4, ey1 = SQ[6].front + 4;
  for (let y = ey0; y < ey1; y++) for (let x = ex0; x < ex1; x++) if ((x * 3 + y * 7) % 11 === 0) p.px(x, y, 1, 1, paper[1]);
  for (const q of SQ) {
    p.px(q.x0 - 1, q.back - 1, W + 2, 1, paper[4]); p.px(q.x0 - 1, q.front, W + 2, 1, paper[4]); p.px(q.x0 - 1, q.back - 1, 1, D + 2, paper[4]); p.px(q.x1, q.back - 1, 1, D + 2, paper[4]);
    for (const [x, y] of [[q.x0 - 2, q.back - 4], [q.x1, q.back - 4], [q.x0 - 2, q.front - 2], [q.x1, q.front - 2]]) { p.px(x, y, 2, 4, brick[3]); p.px(x, y, 2, 1, brick[4]); }   // the pegs
  }
}

// a small piece in a layer (3 to 5 px), so you can tell the layers apart
function bit(p, era, k, x, y) {
  const v = k % 2;
  switch (era) {
    case 0: if (v) { p.px(x, y, 4, 2, brick[3]); p.px(x, y, 4, 1, brick[4]); } else { p.px(x, y, 2, 3, teal[4]); p.px(x, y, 1, 1, teal[5]); } break;   // brick, glass
    case 1: p.px(x, y, 2, 2, paper[5]); p.px(x + 2, y + 1, 3, 1, paper[5]); break;                                                                       // a clay pipe
    case 2: p.px(x, y, 4, 1, brick[3]); p.px(x - 1, y + 1, 6, 1, brick[2]); break;                                                                      // a roof tile
    case 3: if (v) { p.px(x, y, 1, 1, paper[5]); p.px(x + 1, y, 1, 1, brick[3]); p.px(x, y + 1, 1, 1, teal[3]); p.px(x + 1, y + 1, 1, 1, gold[3]); }   // mosaic
      else { p.px(x, y, 4, 2, brick[3]); p.px(x + 3, y - 1, 1, 1, brick[3]); } break;                                                                  // an amphora shard
    case 4: p.px(x, y, 3, 2, teal[3]); p.px(x + 1, y, 1, 1, teal[4]); break;                                                                             // bronze
    case 5: if (v) { p.px(x, y, 3, 2, stone[4]); p.px(x + 1, y, 1, 1, stone[5]); } else { p.px(x, y, 5, 1, paper[5]); p.px(x - 1, y - 1, 1, 3, paper[5]); p.px(x + 5, y - 1, 1, 3, paper[5]); } break;   // flint, a bone
    default: p.px(x, y, 2, 2, gold[3]); p.px(x, y, 1, 1, gold[5]);                                                                                       // gold
  }
}

// ---- the squares: squares[i] = { points, dug } for the 7 squares (or null: closed). A dug square is a hole in the field: the back wall with the layers he went
// through (from the top: Modern, down to the layer of that answer), the side walls leaning in, the floor in the colour of its bottom layer. The deepest square has a
// gold rim; a square that reached the tomb shows the gold sarcophagus and glows gold. ----
export function drawSquares(cv, squares, { deepest = -1, breaking = -1 } = {}) {
  cv.width = SITE.w; cv.height = SITE.h;
  const p = pen(cv.getContext("2d"), SITE.x0, SITE.y0);
  const eraOfDepth = (d) => { let i = 0; while (i + 1 < ERAS.length && d >= zFrom(i + 1)) i++; return i; };
  squares.forEach((sq, i) => {
    if (!sq || !sq.dug) return;
    const q = SQ[i], h = wallH(sq.points), fy = q.back + h, here = eraIndex(sq.points);
    const [fb, fd, fl] = SOIL[here];
    for (let y = q.back; y < q.front; y++) {
      const ins = Math.round(y <= fy ? 0.15 * (y - q.back) : 0.15 * h * (1 - (0.8 * (y - fy)) / (q.front - fy)));
      const d = Math.min(y - q.back, h), e = eraOfDepth(d), [b, dk, l] = SOIL[e];
      for (let x = q.x0; x < q.x1; x++) {
        const hh = hash(x, y), side = x < q.x0 + ins || x >= q.x1 - ins;
        if (y < fy) { const seam = e > 0 && d === zFrom(e); p.px(x, y, 1, 1, side ? ((x + y) % 2 ? dk : b) : seam ? dk : hh < 0.07 ? dk : hh < 0.12 ? l : b); }
        else p.px(x, y, 1, 1, side ? ((x + y) % 2 ? fd : OUT) : hh < 0.15 ? fd : hh < 0.95 ? fb : fl);   // the floor: the bottom layer
      }
    }
    for (let y = q.back; y < Math.min(q.back + 3, fy); y++) p.dith(q.x0, y, W, 1, OUT, y % 2);   // the shadow under the far edge
    p.px(q.x0, q.back, W, 1, OUT);
    p.dith(q.x0, fy, W, 1, OUT);
    for (let e = 0; e <= here; e++) {                             // a piece or two in every layer thick enough to hold one
      const d0 = zFrom(e), d1 = Math.min(e + 1 < ERAS.length ? zFrom(e + 1) : h, h);
      if (d1 - d0 < 4) continue;
      for (let k = 0; k < 2; k++) bit(p, e, k + i, q.x0 + 6 + Math.floor(hash(i * 7 + e, k) * (W - 16)), q.back + d0 + 1 + Math.floor(hash(k, e + i) * Math.max(1, d1 - d0 - 3)));
    }
    if (here === ERAS.length - 1) {                               // the golden tomb: the gold sarcophagus with its mask at the foot of the wall, and the square glows gold
      const sx = q.x0 + 8, sy = fy - 5;
      p.box(sx, sy, 20, 6, gold[3]); p.px(sx, sy, 20, 1, gold[4]); p.box(sx + 7, sy - 4, 6, 4, gold[3]); p.px(sx + 8, sy - 3, 1, 1, OUT); p.px(sx + 11, sy - 3, 1, 1, OUT);
      for (let x = q.x0 - 2; x < q.x1 + 2; x++) { p.dith(x, q.back - 3, 1, 2, gold[3], x % 2); p.dith(x, q.front + 1, 1, 2, gold[3], x % 2); }
      for (let y = q.back - 3; y < q.front + 3; y++) { p.dith(q.x0 - 3, y, 2, 1, gold[3], y % 2); p.dith(q.x1 + 1, y, 2, 1, gold[3], y % 2); }
    }
    if (breaking === i) { p.px(q.x0 + 4, fy - 1, W - 8, 2, gold[5]); }
    for (let x = q.x0; x < q.x1; x++) { p.px(x, q.front - 1 + Math.floor(hash(x, i) * 2), 1, 1, OUT); if (hash(x, i + 3) < 0.4) p.px(x, q.front, 1, 1, paper[3]); }   // the crumbled near edge
    p.px(q.x0 - 1, q.back - 1, W + 2, 1, paper[4]); p.px(q.x0 - 1, q.front + 1, W + 2, 1, paper[4]);   // the string, over the hole's edges
    if (i === deepest) { p.px(q.x0 - 2, q.back - 2, W + 4, 1, gold[3]); p.px(q.x0 - 2, q.front + 2, W + 4, 1, gold[3]); p.px(q.x0 - 2, q.back - 2, 1, D + 5, gold[3]); p.px(q.x1 + 1, q.back - 2, 1, D + 5, gold[3]); }
  });
}
