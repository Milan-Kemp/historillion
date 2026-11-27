// Historillion, 2D kit v13: digging = travelling back in time. Every era is a pixel world of its own; the archaeologist digs a pit in it. Every answer takes the pit
// deeper by its points (more points, more swings, a deeper pit). When the pit reaches the bottom of this world the floor breaks, light comes up from the older world,
// he jumps in and drops into it, and digs on there. The pit shows how far you are in an era; the world you stand in is your depth (no metre scale any more).
// Replaces shaft-scene.js with the same API (same top bar, sound and phone layout of v10):
//
//   import { mountScene, ERAS, eraAt, coreSample } from "../kit-b/world-scene.js";
//   const scene = mountScene(document.body);
//   scene.hud({ progress, counter, score, timer, chip, soundLabel }) / scene.hud(null)       // null = intro / end screen: the world fills the screen (end screen: a short fly-over)
//   scene.ready() / scene.idle() / scene.reset()                                               // question 1 / every other question / = idle
//   await scene.dig(key, points)     // key: common | uncommon | rare | veryRare | none; resolves when the find is shown (remove .wait then)
//   scene.newDay() / scene.setDay([{ key, points }, ...])                                      // back to the Modern world / restore a stored day (no animation)
//   scene.depth / scene.finds        // points today / [{ key, points, depth, era }]  (era: index into ERAS)
//   scene.urgent(on) / scene.celebrate(on) / scene.sound / scene.fit()
// Any key press or tap during a dig jumps to its end state; Next and the input are never blocked. prefers-reduced-motion: the end state at once, nothing moves.

import { createSound } from "./sound.js";

// the worlds, young to old. `from` is in points (a player gets 0 to 100 per question, 7 questions). v13 briefing: 0, 100, 200, 260, 310, 360, 420;
// widened after play (Milan): the later eras were only 50 points deep, so one good answer always crossed one. Now 80, 80, 70, 70, 60, 60 points; the tomb stays at 420 (1 in 100).
export const ERAS = [
  { from: 0, name: "Modern", years: "1800 to now" },
  { from: 80, name: "Early modern", years: "1500 to 1800" },
  { from: 160, name: "Medieval", years: "500 to 1500" },
  { from: 230, name: "Roman & Classical", years: "800 BC to AD 500" },
  { from: 300, name: "Bronze & Iron Age", years: "3300 to 800 BC" },
  { from: 360, name: "Stone Age", years: "before 3300 BC" },
  { from: 420, name: "One in a Historillion", years: "The hidden golden tomb" },
];
const eraIndex = (p) => { let i = 0; while (i + 1 < ERAS.length && p >= ERAS[i + 1].from) i++; return i; };
export const eraAt = (p) => ERAS[eraIndex(Math.max(0, p))];

const KEYS = new Set(["common", "uncommon", "rare", "veryRare", "none"]);
const MAN = { idle: [0, 4, 52, 88], ready: [6, 6, 52, 88], dig: [8, 8, 76, 80], rx_none: [14, 8, 76, 80], rx_common: [15, 8, 76, 80], rx_uncommon: [16, 8, 76, 80], rx_rare: [17, 8, 76, 80], rx_veryRare: [18, 8, 76, 80] };   // row, frames, feet x, feet y in man.png

// ---- the channel palette (palette.json): every pixel of the worlds is one of these ----
const OUT = "#0e0a18";
const night = ["#0a0c22", "#121234", "#1e1846", "#2e1e56", "#442662", "#5c3068"];
const sky = ["#283874", "#3858a6", "#5080d0", "#7aaae6", "#acd2f0", "#deeefa"];
const stone = ["#28223a", "#3e3652", "#5c5270", "#827a96", "#b0aabe", "#dcd8e2"];
const wood = ["#2c1822", "#482626", "#683a2c", "#8e5434", "#b87a44", "#dea662"];
const brick = ["#3a1426", "#62202e", "#962c34", "#cc3e3c", "#ec6e5a", "#faaa8c"];
const gold = ["#482822", "#8c541c", "#ce8c24", "#ffd038", "#ffee96", "#fffade"];
const paper = ["#5a464a", "#8c7468", "#bea880", "#dcc89c", "#f4e6ba", "#faf6eb"];
const leaf = ["#14282e", "#1e423a", "#2e6240", "#4e8446", "#7eaa54", "#bace78"];
const teal = ["#18283a", "#223e4c", "#30585e", "#467670", "#689686", "#96baa2"];

// the picture, in art pixels: a 640 px wide world. He digs at DIGX; the pit is right of him. The ground is 56 px thick: the pit is PITMAX deep when the era is done,
// and then he breaks through into the next (older) world. So the pit shows how far you are in this era, and only enough points take you to the next one.
const WW = 640, WH = 240, GY = 184, FEET = GY + 5, DIGX = 236, PIT_X = DIGX + 6, PIT_W = 30, PITMAX = 46;
// the soil of each world (base, dark, light): the pit walls and the spoil heap
const DIRT = [[stone[2], stone[1], stone[3]], [wood[3], wood[2], wood[4]], [wood[3], wood[2], wood[4]], [paper[3], paper[1], paper[4]], [gold[3], gold[2], gold[4]], [wood[1], wood[0], wood[2]], [stone[1], stone[0], stone[2]]];

function el(tag, className, props = {}) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  Object.assign(n, props);
  return n;
}
function canvas(w, h) { const c = el("canvas"); c.width = w; c.height = h; return c; }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }   // the same "random" details every time

function speaker(muted) {                                      // a 12 x 12 pixel speaker, built from squares with createElementNS
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 12 12");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("shape-rendering", "crispEdges");
  const rect = (x, y, w, h) => { const r = document.createElementNS(ns, "rect"); r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", h); r.setAttribute("fill", "currentColor"); svg.append(r); };
  rect(1, 4, 2, 4); rect(3, 3, 1, 6); rect(4, 2, 1, 8); rect(5, 1, 1, 10);
  if (muted) { rect(7, 4, 1, 1); rect(8, 5, 1, 1); rect(9, 6, 1, 1); rect(10, 7, 1, 1); rect(10, 4, 1, 1); rect(9, 5, 1, 1); rect(8, 6, 1, 1); rect(7, 7, 1, 1); }
  else { rect(7, 5, 1, 2); rect(9, 3, 1, 6); rect(8, 4, 1, 1); rect(8, 7, 1, 1); }
  return svg;
}

// ---- drawing helpers on one canvas context: flat blocks, 1 px outlines, checker dithering between tones (no gradients, no anti-aliasing) ----
function pen(g) {
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const dith = (x, y, w, h, c, o = 0) => { g.fillStyle = c; for (let j = 0; j < h; j++) for (let i = (j + o) & 1; i < w; i += 2) g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); };
  const box = (x, y, w, h, c) => { px(x - 1, y - 1, w + 2, h + 2, OUT); px(x, y, w, h, c); };          // a block with its outline
  const bands = (list) => {                                     // sky stripes from y 0, a dithered row at each seam
    let y = 0; const ys = [];
    for (const [c, h] of list) { px(0, y, WW, h, c); ys.push(y); y += h; }
    for (let i = 1; i < list.length; i++) { dith(0, ys[i] - 1, WW, 1, list[i][0]); dith(0, ys[i], WW, 1, list[i - 1][0], 1); }
    return y;
  };
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); px(cx - w, cy + y, 2 * w + 1, 1, c); } };
  const ridge = (y0, amp, f, c, ph = 0, bottom = GY) => { for (let x = 0; x < WW; x++) { const h = Math.round(amp * (0.6 * Math.sin(x / f + ph) + 0.4 * Math.sin(x / (f * 0.37) + ph * 2))); px(x, y0 - h, 1, bottom - y0 + h, c); } };
  const tri = (cx, top, base, half, c, side = 0) => {           // a triangle (pyramid, gable, pediment); side -1 / 1: only the left / right half
    for (let y = top; y < base; y++) { const w = Math.round(((y - top + 1) / (base - top)) * half); px(side > 0 ? cx : cx - w, y, side ? w + 1 : 2 * w + 1, 1, c); }
  };
  const speck = (x, y, w, h, n, cs, r) => { for (let i = 0; i < n; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1, cs[Math.floor(r() * cs.length)]); };
  const soil = (base, dark, light, r, n = 900) => { px(0, GY, WW, WH - GY, base); px(0, GY, WW, 1, light); dith(0, GY + 1, WW, 1, light); speck(0, GY + 2, WW, WH - GY - 2, n, [dark, light], r); };
  const windows = (x, y, cols, rows, dx, dy, lit, darkc, r) => { for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { px(x + i * dx - 1, y + j * dy - 1, 4, 5, OUT); px(x + i * dx, y + j * dy, 2, 3, r() < 0.7 ? lit : darkc); } };
  const sprite = (x, y, rows, map) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) px(x + i, y + j, 1, 1, map[ch]); }));
  return { g, px, dith, box, bands, disc, ridge, tri, speck, soil, windows, sprite };
}

// a gabled town house (wall, roof, windows) standing on the ground at `base`
function house(p, r, x, w, h, wall, roof, base = GY, gable = "pitched") {
  const top = base - h;
  p.box(x, top, w, h, wall);
  p.dith(x + w - 3, top, 3, h, OUT);                            // the shadow side
  if (gable === "pitched") { p.tri(x + w / 2, top - Math.round(w / 2.4) - 1, top, Math.round(w / 2) + 1, OUT); p.tri(x + w / 2, top - Math.round(w / 2.4), top, Math.round(w / 2), roof); }
  else if (gable === "stepped") { for (let k = 0; k < 4; k++) { const ww = w - k * Math.round(w / 4.5); p.box(x + (w - ww) / 2, top - (k + 1) * 4, ww, 4, wall); } }
  else if (gable === "flat") { p.px(x - 2, top - 3, w + 4, 3, roof); p.px(x - 2, top - 4, w + 4, 1, OUT); }
  p.windows(x + 3, top + 5, Math.max(1, Math.floor((w - 4) / 6)), Math.max(1, Math.floor((h - 12) / 9)), 6, 9, gold[3], night[1], r);
  p.box(x + Math.floor(w / 2) - 2, base - 8, 4, 8, wood[1]);   // the door
}

// ---- the seven worlds. back(): sky and far things (slower parallax); front(): buildings and the ground he walks on; anim(): what moves, drawn 8 times a second ----
// back = behind the moving things, front = in front of them; animBack sits between back and front, animFront above front.
const WORLDS = [
  { // Modern, 1800 to now: a city of brick at a smoky dusk, factory chimneys, a steam train on the embankment
    top: night[2], floor: stone[1], thumb: [596, 118],
    back(p, r) {
      p.bands([[night[2], 34], [night[3], 24], [night[5], 18], [brick[2], 14], [brick[3], 12], [brick[4], 10], [gold[3], 6], [gold[4], 66]]);
      p.disc(430, 120, 13, gold[5]); p.dith(414, 104, 33, 30, gold[4]);
      for (const [x, h] of [[60, 86], [180, 70], [270, 96], [500, 80], [590, 66]]) {     // factory chimneys with their smoke
        p.px(x, GY - 40 - h, 7, h, night[4]); p.px(x - 1, GY - 42 - h, 9, 3, night[3]);
        for (let k = 0; k < 7; k++) { const sx = x + 4 + k * 7, sy = GY - 48 - h - k * 4; p.disc(sx, sy, 3 + Math.floor(k / 2), k % 2 ? night[5] : stone[2]); }
      }
      let x = 0;
      while (x < WW) { const w = 14 + Math.floor(r() * 26), h = 16 + Math.floor(r() * 30); p.px(x, GY - 40 - h, w, h + 40, night[4]); x += w; }
      p.px(372, GY - 120, 16, 80, night[4]); p.tri(380, GY - 138, GY - 120, 9, night[4]); p.disc(380, GY - 108, 4, gold[3]); p.px(380, GY - 110, 1, 3, OUT);   // the clock tower
      x = 0;
      while (x < WW) { const w = 10 + Math.floor(r() * 18), h = 8 + Math.floor(r() * 22); p.px(x, GY - 28 - h, w, h + 28, night[3]); for (let k = 0; k < w * h / 40; k++) p.px(x + 2 + Math.floor(r() * (w - 3)), GY - 26 - h + Math.floor(r() * h), 1, 2, gold[3]); x += w + 1; }
    },
    front(p, r) {
      p.px(0, GY - 28, WW, 28, brick[1]);                          // the embankment wall with the rails on top
      for (let y = GY - 26; y < GY; y += 4) for (let x = (y / 4) % 2 ? 0 : 5; x < WW; x += 10) p.px(x, y, 1, 4, brick[0]);
      for (let y = GY - 26; y < GY; y += 4) p.px(0, y, WW, 1, brick[0]);
      p.px(0, GY - 29, WW, 1, stone[3]); p.px(0, GY - 28, WW, 1, OUT);
      for (let x = 2; x < WW; x += 6) p.px(x, GY - 30, 3, 1, wood[1]);
      house(p, r, 4, 34, 66, brick[2], stone[1], GY, "pitched"); house(p, r, 42, 30, 58, brick[3], stone[1]); house(p, r, 76, 38, 74, brick[2], night[2], GY, "flat");
      house(p, r, 118, 26, 52, paper[1], stone[1]);
      house(p, r, 470, 30, 60, brick[3], stone[1]); house(p, r, 504, 40, 76, brick[2], night[2], GY, "flat"); house(p, r, 548, 32, 62, paper[1], stone[1]); house(p, r, 584, 52, 70, brick[2], stone[1], GY, "flat");
      for (const x of [170, 300, 430]) {                          // gas lamps
        p.px(x, GY - 34, 2, 34, OUT); p.box(x - 2, GY - 40, 6, 6, gold[4]); p.px(x - 3, GY - 42, 8, 2, OUT); p.dith(x - 8, GY - 46, 18, 16, gold[3]);
      }
      p.soil(stone[2], stone[1], stone[3], r, 200);              // cobbles
      for (let y = GY + 3; y < WH; y += 4) for (let x = (y % 8) * 2; x < WW; x += 8) { p.px(x, y, 7, 1, stone[3]); p.px(x, y + 3, 8, 1, stone[1]); }
    },
    anim(b, f, t) {                                              // the steam train runs right to left behind the houses
      const tx = WW - ((t * 30) % 900) + 40, by = GY - 30;
      for (let k = 0; k < 6; k++) { const q = (t * 3 + k) % 6; b.disc(tx + 8 + q * 10, by - 30 - q * 3, 2 + Math.floor(q / 2), q % 2 ? stone[4] : stone[3]); }
      b.box(tx, by - 16, 30, 11, night[2]); b.px(tx, by - 16, 30, 2, stone[2]); b.box(tx + 6, by - 24, 4, 7, night[1]);
      b.box(tx + 30, by - 24, 14, 19, brick[2]); b.px(tx + 34, by - 21, 6, 5, gold[3]); b.px(tx - 3, by - 7, 4, 3, brick[3]);
      for (const wx of [tx + 6, tx + 16, tx + 26, tx + 38]) { b.disc(wx, by - 3, 3, OUT); b.px(wx, by - 3, 1, 1, stone[3]); }
      for (let c = 0; c < 3; c++) { const cx = tx + 48 + c * 38; b.box(cx, by - 20, 34, 15, teal[2]); b.px(cx, by - 20, 34, 2, teal[3]); for (let w = 0; w < 4; w++) b.px(cx + 3 + w * 8, by - 16, 5, 5, gold[3]); for (const wx of [cx + 6, cx + 28]) b.disc(wx, by - 3, 3, OUT); }
    },
  },
  { // Early modern, 1500 to 1800: a harbour in bright daylight, sailing ships, renaissance houses and a domed church
    top: sky[1], floor: wood[1], thumb: [114, 56],
    back(p, r) {
      p.bands([[sky[1], 36], [sky[2], 34], [sky[3], 30], [sky[4], 28], [sky[5], 56]]);
      for (const [x, y, w] of [[60, 30, 50], [250, 50, 70], [470, 24, 60], [600, 60, 40]]) { p.px(x, y, w, 6, paper[5]); p.px(x + 8, y - 5, w - 20, 5, paper[5]); p.px(x + 4, y + 6, w - 4, 2, sky[4]); }
      p.px(0, 132, WW, GY - 132, teal[3]);                        // the open sea
      for (let k = 0; k < 120; k++) p.px(Math.floor(r() * WW), 134 + Math.floor(r() * (GY - 136)), 3 + Math.floor(r() * 5), 1, teal[4]);
      p.ridge(132, 5, 30, sky[3], 1, 133); p.px(0, 131, WW, 1, teal[4]);
      for (let x = 0; x < 230; x += 9) { const h = 10 + Math.floor(r() * 16); p.px(x, 132 - h, 8, h, sky[2]); p.tri(x + 4, 128 - h, 132 - h, 4, sky[2]); }   // the far town
      p.disc(150, 104, 12, sky[2]); p.px(138, 104, 25, 28, sky[2]); p.px(148, 86, 5, 7, sky[2]);
      p.px(196, 70, 9, 62, sky[2]); p.tri(200, 62, 70, 5, sky[2]);
    },
    front(p, r) {
      p.px(232, GY - 26, WW - 232, 14, teal[2]);                   // the harbour water in front of the ships
      for (let k = 0; k < 60; k++) p.px(232 + Math.floor(r() * (WW - 236)), GY - 25 + Math.floor(r() * 12), 4, 1, teal[3]);
      p.px(232, GY - 12, WW - 232, 12, stone[3]);                  // the quay wall
      for (let x = 232; x < WW; x += 12) { p.px(x, GY - 12, 1, 12, stone[1]); p.px(x + 6, GY - 6, 1, 6, stone[1]); }
      p.px(232, GY - 6, WW - 232, 1, stone[1]); p.px(232, GY - 13, WW - 232, 1, stone[4]);
      const cols = [brick[3], paper[3], teal[4], brick[4], paper[4], gold[2]];
      let x = 2;
      for (let i = 0; i < 6; i++) { const w = 24 + Math.floor(r() * 10); house(p, r, x, w, 54 + Math.floor(r() * 26), cols[i], brick[2], GY, i % 2 ? "stepped" : "pitched"); x += w + 2; }
      p.box(120, GY - 118, 30, 40, paper[4]); p.disc(135, GY - 122, 13, teal[3]); p.px(122, GY - 122, 27, 4, teal[3]); p.dith(135, GY - 134, 12, 12, teal[2]); p.box(133, GY - 142, 4, 8, paper[5]); p.px(134, GY - 148, 2, 6, gold[3]);   // the dome
      for (const [bx, k] of [[250, 0], [270, 1], [292, 0]]) { p.box(bx, GY - 12, 14, 12, k ? wood[2] : wood[3]); p.px(bx, GY - 9, 14, 1, wood[1]); p.px(bx, GY - 4, 14, 1, wood[1]); }   // barrels and a crate
      p.box(560, GY - 30, 4, 18, wood[2]); p.px(556, GY - 30, 12, 2, wood[1]);   // a bollard post
      p.soil(wood[3], wood[2], wood[4], r, 120);                    // the quay planks
      for (let y = GY + 4; y < WH; y += 5) p.px(0, y, WW, 1, wood[2]);
      for (let y = GY + 4; y < WH; y += 5) for (let x2 = (y * 7) % 23; x2 < WW; x2 += 23) p.px(x2, y, 1, 5, wood[1]);
    },
    anim(b, f, t) {
      const ship = (x, wl, s, bob) => {
        const y = wl + bob;
        for (const [mx, mh] of [[x + 10 * s, 50 * s], [x + 22 * s, 58 * s], [x + 34 * s, 44 * s]]) {
          b.px(mx, y - 8 - mh, 2, mh, wood[1]);
          for (let k = 0; k < 3; k++) { const sw = Math.round((14 - k * 2) * s), sh = Math.round(10 * s); b.box(mx - sw / 2 + 1, y - 8 - mh + 6 + k * (sh + 3), sw, sh, paper[5]); b.dith(mx + 1, y - 8 - mh + 6 + k * (sh + 3), sw / 2 - 1, sh, paper[3]); }
          b.px(mx + 2, y - 10 - mh, 6, 3, brick[3]);
        }
        b.box(x, y - 10, 46 * s, 12, wood[2]); b.px(x, y - 10, 46 * s, 2, wood[4]); b.box(x + 34 * s, y - 16, 12 * s, 6, wood[3]); b.px(x - 6, y - 12, 8, 2, wood[1]);
        for (let k = 0; k < 4; k++) b.px(x + 6 + k * 9 * s, y - 6, 3, 2, OUT);
      };
      ship(300, GY - 22, 1.3, Math.round(Math.sin(t * 2.2)));
      ship(500, GY - 24, 1, Math.round(Math.sin(t * 2.2 + 2)));
      for (let k = 0; k < 3; k++) { const gx = ((t * (12 + k * 5) + k * 230) % 720) - 40, gy = 40 + k * 18 + Math.round(Math.sin(t * 3 + k) * 2), up = Math.floor(t * 4 + k) % 2; f.px(gx, gy + up, 2, 1, paper[5]); f.px(gx + 2, gy + 1, 1, 1, paper[5]); f.px(gx + 3, gy + up, 2, 1, paper[5]); }
    },
  },
  { // Medieval, 500 to 1500: a golden morning, a castle on the hill, a cathedral being built with scaffolding and a treadwheel crane
    top: sky[2], floor: wood[1], thumb: [330, 6],
    back(p, r) {
      p.bands([[sky[2], 30], [sky[3], 28], [sky[4], 22], [brick[5], 20], [gold[4], 18], [gold[5], 66]]);
      p.disc(560, 108, 10, gold[5]); p.dith(546, 94, 29, 28, gold[4]);
      p.ridge(132, 10, 40, leaf[2], 0.5); p.ridge(126, 16, 60, leaf[1], 2, 150);
      const cx = 150, cy = 112;                                    // the castle on the hill
      p.box(cx - 50, cy - 20, 100, 28, stone[3]); for (let x = cx - 50; x < cx + 50; x += 6) p.px(x, cy - 24, 4, 4, stone[3]);
      p.dith(cx + 20, cy - 20, 30, 28, stone[2]);
      for (const tx of [cx - 56, cx + 44]) { p.box(tx, cy - 38, 12, 46, stone[4]); p.tri(tx + 6, cy - 54, cy - 38, 8, brick[2]); p.px(tx + 4, cy - 28, 3, 5, OUT); }
      p.box(cx - 12, cy - 52, 24, 34, stone[4]); for (let x = cx - 12; x < cx + 12; x += 6) p.px(x, cy - 56, 4, 4, stone[4]); p.px(cx - 2, cy - 72, 1, 16, OUT); p.px(cx - 1, cy - 72, 9, 5, brick[3]);
      p.px(cx - 4, cy - 40, 3, 6, OUT); p.px(cx + 4, cy - 40, 3, 6, OUT); p.px(cx - 4, cy - 2, 8, 10, OUT);
      p.ridge(150, 6, 24, leaf[2], 3, GY); p.px(0, 150, WW, GY - 150, leaf[2]);
    },
    front(p, r) {
      for (const [x, w, h] of [[8, 34, 46], [48, 30, 40], [84, 38, 50], [128, 28, 38]]) {   // timber-framed houses with thatch
        p.box(x, GY - h, w, h, paper[4]); p.px(x, GY - h + 10, w, 2, wood[1]); p.px(x, GY - h + 24, w, 2, wood[1]);
        for (let k = 0; k < w; k += 8) p.px(x + k, GY - h, 2, h, wood[1]);
        p.tri(x + w / 2, GY - h - 19, GY - h, w / 2 + 4, OUT); p.tri(x + w / 2, GY - h - 18, GY - h + 1, w / 2 + 3, gold[2]); p.dith(x + w / 2, GY - h - 16, w / 2 + 3, 16, gold[1]);
        p.px(x + 4, GY - h + 14, 4, 6, gold[3]); p.box(x + w - 10, GY - 10, 6, 10, wood[2]);
      }
      const L = 330, R = 520;                                      // the cathedral, its right tower not finished
      p.box(L, GY - 92, R - L, 92, stone[4]); p.dith(L + 120, GY - 92, R - L - 120, 92, stone[3]);
      p.box(L, GY - 132, 40, 132, stone[4]); p.tri(L + 20, GY - 172, GY - 132, 18, OUT); p.tri(L + 20, GY - 171, GY - 131, 17, stone[3]); p.px(L + 19, GY - 182, 2, 12, gold[3]);
      for (let k = 0; k < 3; k++) { p.px(L + 8, GY - 120 + k * 26, 6, 14, OUT); p.px(L + 26, GY - 120 + k * 26, 6, 14, OUT); }
      p.box(R - 42, GY - 104, 42, 104, stone[4]); for (let x = R - 42; x < R; x += 5) p.px(x, GY - 104 - Math.floor(r() * 8), 5, 8, stone[4]);
      for (let y = GY - 112; y < GY; y += 14) p.px(R - 48, y, 54, 1, wood[3]); for (const x of [R - 48, R - 30, R - 12, R + 5]) p.px(x, GY - 116, 1, 116, wood[3]);   // scaffolding
      p.tri(L + 100, GY - 92, GY - 40, 26, OUT); p.tri(L + 100, GY - 90, GY - 40, 24, night[1]); p.px(L + 76, GY - 40, 49, 40, night[1]);   // the portal
      p.disc(L + 100, GY - 70, 10, OUT); p.disc(L + 100, GY - 70, 9, teal[4]); p.px(L + 91, GY - 70, 19, 1, OUT); p.px(L + 100, GY - 79, 1, 19, OUT); p.disc(L + 100, GY - 70, 2, brick[3]);
      p.box(L + 46, GY - 40, 20, 28, stone[3]); p.box(L + 134, GY - 30, 16, 8, stone[3]); p.box(L + 152, GY - 8, 12, 8, stone[3]);   // stone blocks waiting
      p.box(576, GY - 96, 3, 96, wood[2]); p.px(540, GY - 98, 60, 3, wood[2]); p.px(538, GY - 99, 64, 1, OUT);   // the crane
      p.disc(590, GY - 18, 17, OUT); p.disc(590, GY - 18, 16, wood[3]); p.disc(590, GY - 18, 12, wood[2]); p.px(578, GY - 4, 25, 4, wood[1]);
      p.soil(wood[3], wood[2], wood[4], r, 500);
      for (let x = 0; x < WW; x += 5) if (r() < 0.6) p.px(x, GY - 1 - Math.floor(r() * 2), 1, 2, leaf[3]);
      p.px(0, GY + 10, WW, 2, wood[2]); p.px(0, GY + 22, WW, 2, wood[2]);   // ruts in the road
    },
    anim(b, f, t) {
      const a = t * 1.2;                                           // the wheel turns, the block rises and sinks on its rope
      for (let k = 0; k < 4; k++) { const an = a + (k * Math.PI) / 4; for (let q = -11; q <= 11; q++) f.px(590 + Math.round(Math.cos(an) * q), GY - 18 + Math.round(Math.sin(an) * q), 1, 1, wood[1]); }
      const by = GY - 70 + Math.round(Math.sin(t * 0.6) * 20);
      f.px(545, GY - 95, 1, by - (GY - 95), paper[2]); f.box(540, by, 11, 8, stone[3]);
      for (let k = 0; k < 2; k++) { const gx = ((t * (14 + k * 6) + k * 300) % 720) - 40, gy = 30 + k * 22, up = Math.floor(t * 4 + k) % 2; f.px(gx, gy + up, 2, 1, night[2]); f.px(gx + 2, gy + 1, 1, 1, night[2]); f.px(gx + 3, gy + up, 2, 1, night[2]); }
    },
  },
  { // Roman & Classical, 800 BC to AD 500: a bright day, a temple and a colonnade on the forum, the amphitheatre and an aqueduct beyond
    top: sky[1], floor: paper[1], thumb: [108, 56],
    back(p, r) {
      p.bands([[sky[1], 30], [sky[2], 30], [sky[3], 32], [sky[4], 30], [sky[5], 62]]);
      for (const [x, y, w] of [[90, 26, 60], [400, 40, 80]]) { p.px(x, y, w, 5, paper[5]); p.px(x + 10, y - 4, w - 26, 4, paper[5]); }
      p.ridge(140, 12, 44, teal[3], 1); p.ridge(152, 6, 20, leaf[2], 2);
      for (let x = 0; x < 230; x += 22) { p.px(x, 120, 16, 4, paper[2]); p.px(x, 124, 3, 30, paper[2]); p.px(x + 13, 124, 3, 30, paper[2]); }   // the aqueduct
      p.px(0, 116, 230, 4, paper[2]);
      const ax = 380, aw = 230;                                    // the amphitheatre: three rings of arches and a top storey
      p.box(ax, 92, aw, 62, paper[3]); p.px(ax, 92, aw, 5, paper[4]); p.dith(ax + aw - 50, 92, 50, 62, paper[2]);
      for (let row = 0; row < 3; row++) for (let x = ax + 4; x < ax + aw - 6; x += 12) { p.px(x, 100 + row * 18, 7, 12, paper[1]); p.px(x + 1, 99 + row * 18, 5, 1, paper[1]); }
      for (let x = ax + 6; x < ax + aw - 6; x += 12) p.px(x, 96, 3, 2, paper[1]);
      for (const x of [40, 300, 620]) { p.px(x, 108, 4, 48, leaf[0]); p.tri(x + 2, 96, 120, 4, leaf[0]); }   // cypresses
    },
    front(p, r) {
      const tx = 40, tw = 180, base = GY - 14;                     // the temple
      for (let k = 0; k < 4; k++) p.box(tx - 10 + k * 3, base + k * 3 + 2, tw + 20 - k * 6, 3, paper[3]);
      p.box(tx, base - 8, tw, 8, paper[3]);
      for (let c = 0; c < 6; c++) { const cx = tx + 6 + c * 32; p.box(cx, base - 66, 12, 58, paper[5]); p.px(cx + 3, base - 66, 1, 58, paper[3]); p.px(cx + 7, base - 66, 1, 58, paper[3]); p.dith(cx + 9, base - 66, 3, 58, paper[2]); p.box(cx - 2, base - 70, 16, 4, paper[4]); }
      p.box(tx - 4, base - 84, tw + 8, 14, paper[4]); p.px(tx - 4, base - 76, tw + 8, 1, paper[2]);
      p.tri(tx + tw / 2, base - 112, base - 84, tw / 2 + 6, OUT); p.tri(tx + tw / 2, base - 110, base - 85, tw / 2 + 4, paper[4]); p.tri(tx + tw / 2, base - 104, base - 88, tw / 2 - 10, paper[3]);
      p.px(tx + tw / 2 - 1, base - 124, 2, 14, wood[1]);
      for (let c = 0; c < 6; c++) { const cx = 262 + c * 26; p.box(cx, GY - 52, 8, 52, paper[4]); p.dith(cx + 5, GY - 52, 3, 52, paper[2]); p.box(cx - 2, GY - 56, 12, 4, paper[3]); }   // the colonnade
      p.box(258, GY - 62, 160, 6, paper[3]); p.px(258, GY - 63, 160, 1, brick[2]);
      p.box(470, GY - 22, 22, 22, paper[3]); p.box(476, GY - 50, 10, 28, teal[3]); p.disc(481, GY - 54, 4, teal[3]); p.px(486, GY - 46, 7, 2, teal[3]); p.dith(482, GY - 50, 4, 28, teal[2]);   // a bronze statue
      p.px(600, GY - 70, 5, 70, leaf[0]); p.tri(602, GY - 92, GY - 50, 8, leaf[1]); p.dith(602, GY - 88, 8, 36, leaf[0]);
      p.soil(paper[3], paper[1], paper[4], r, 300);              // paving slabs
      for (let y = GY + 6; y < WH; y += 8) { p.px(0, y, WW, 1, paper[1]); for (let x = (y % 16) * 2; x < WW; x += 24) p.px(x, y, 1, 8, paper[1]); }
    },
    anim(b, f, t) {
      const w = Math.floor(t * 3) % 3;                             // a red banner on the temple roof
      f.px(131, GY - 138, 12 - w, 6, brick[3]); f.px(131 + 12 - w, GY - 137 + (w % 2), 2, 4, brick[3]); f.px(131, GY - 133, 12 - w, 1, brick[2]);
      for (let k = 0; k < 2; k++) { const gx = ((t * (11 + k * 4) + k * 280) % 720) - 40, gy = 36 + k * 20, up = Math.floor(t * 4 + k) % 2; f.px(gx, gy + up, 2, 1, night[2]); f.px(gx + 2, gy + 1, 1, 1, night[2]); f.px(gx + 3, gy + up, 2, 1, night[2]); }
    },
  },
  { // Bronze & Iron Age, 3300 to 800 BC: the hot desert, pyramids and a ziggurat, palms and mud-brick houses
    top: sky[2], floor: gold[1], thumb: [448, 62],
    back(p, r) {
      p.bands([[sky[2], 28], [sky[3], 30], [sky[4], 30], [gold[5], 22], [gold[4], 74]]);
      p.disc(110, 56, 15, gold[5]); p.dith(90, 36, 41, 41, gold[4]);
      p.ridge(150, 6, 50, gold[2], 1);
      const pyr = (cx, h, hw) => { p.tri(cx, 150 - h, 150, hw, gold[3], -1); p.tri(cx, 150 - h, 150, hw, wood[3], 1); p.px(cx, 150 - h, 1, h, gold[4]); };
      pyr(470, 84, 92); pyr(360, 54, 60); pyr(590, 44, 48);
      for (let k = 0; k < 5; k++) { const w = 150 - k * 28, y = 150 - (k + 1) * 14; p.box(110 - w / 2, y, w, 14, k % 2 ? brick[4] : wood[4]); p.dith(110 + w / 2 - 12, y, 12, 14, wood[3]); }   // the ziggurat
      p.box(102, 66, 16, 14, brick[3]); p.px(108, 98, 4, 52, wood[3]);
      p.px(0, 150, WW, GY - 150, gold[3]); p.dith(0, 150, WW, 2, gold[2]);
    },
    front(p, r) {
      for (const [x, w, h] of [[190, 40, 30], [234, 30, 24]]) { p.box(x, GY - h, w, h, wood[4]); p.px(x - 2, GY - h - 3, w + 4, 3, wood[3]); p.box(x + 6, GY - 14, 8, 14, OUT); p.px(x + w - 12, GY - h + 8, 5, 4, OUT); p.dith(x + w - 6, GY - h, 6, h, wood[3]); }
      const palm = (x, h) => {
        for (let y = 0; y < h; y += 4) { p.px(x + Math.round(Math.sin(y / 18) * 3), GY - y - 4, 5, 4, wood[2]); p.px(x + Math.round(Math.sin(y / 18) * 3), GY - y - 4, 5, 1, wood[1]); }
        const top = GY - h - 2, tx = x + 2 + Math.round(Math.sin(h / 18) * 3);
        for (const [dx, dy] of [[-1, 0], [1, 0], [-1, -1], [1, -1], [0, -1]]) for (let q = 0; q < 18; q++) p.px(tx + dx * q, top + dy * 6 + Math.round((q * q) / 30) + (dy ? -q / 4 : 0), 3, 2, q % 3 ? leaf[3] : leaf[2]);
        p.disc(tx, top + 2, 3, wood[3]);
      };
      palm(40, 70); palm(140, 56); palm(320, 64); palm(560, 78);
      p.box(410, GY - 40, 10, 40, gold[2]); p.tri(415, GY - 48, GY - 40, 5, gold[4]); p.dith(416, GY - 40, 4, 40, wood[3]);   // an obelisk
      p.soil(gold[3], gold[2], gold[4], r, 500);
      for (let y = GY + 6; y < WH; y += 9) for (let x = (y * 13) % 40; x < WW; x += 40) p.px(x, y, 14, 1, gold[2]);
    },
    anim(b, f, t) {
      for (let k = 0; k < 2; k++) { const gx = ((t * (9 + k * 4) + k * 250) % 720) - 40, gy = 30 + k * 16, up = Math.floor(t * 4 + k) % 2; f.px(gx, gy + up, 2, 1, night[2]); f.px(gx + 2, gy + 1, 1, 1, night[2]); f.px(gx + 3, gy + up, 2, 1, night[2]); }
      const sh = Math.floor(t * 2) % 2;                            // heat shimmer on the sand
      for (let k = 0; k < 6; k++) f.px(60 + k * 100 + sh * 3, GY - 2, 10, 1, gold[4]);
    },
  },
  { // Stone Age, before 3300 BC: a starry night, a cave with paintings, a fire, and a circle of standing stones on the hill
    top: night[0], floor: wood[0], thumb: [140, 64],
    back(p, r) {
      p.bands([[night[0], 30], [night[1], 30], [night[2], 28], [night[3], 24], [night[4], 14], [night[5], 58]]);
      for (let k = 0; k < 90; k++) p.px(Math.floor(r() * WW), Math.floor(r() * 110), 1, 1, r() < 0.3 ? gold[4] : paper[5]);
      p.disc(470, 40, 10, paper[5]); p.px(466, 36, 3, 3, stone[4]); p.px(473, 43, 2, 2, stone[4]);
      p.ridge(130, 12, 56, night[3], 1); p.ridge(146, 6, 30, stone[0], 2.5);
      for (let k = 0; k < 6; k++) { const x = 330 + k * 26, h = 22 + (k % 2) * 4; p.box(x, 120 - h, 8, h, stone[2]); p.px(x, 120 - h, 2, h, stone[3]); if (k % 2 === 0) { p.box(x - 2, 118 - h - 6, 34, 5, stone[2]); p.px(x - 2, 118 - h - 6, 34, 1, stone[3]); } }   // the stone circle
    },
    front(p, r) {
      p.px(0, 40, 200, GY - 40, stone[1]);                         // the cliff with the cave
      for (let x = 0; x < 214; x++) { const h = Math.round(140 + 10 * Math.sin(x / 9) + 8 * Math.sin(x / 23)); if (x > 180) p.px(x, GY - h + (x - 180) * 4, 1, h - (x - 180) * 4, stone[1]); else p.px(x, GY - h, 1, h, stone[1]); }
      p.speck(0, 30, 200, GY - 30, 900, [stone[0], stone[2]], r);
      p.tri(80, GY - 80, GY, 46, OUT); p.tri(80, GY - 77, GY, 43, night[0]);
      const paint = (x, y, c) => { p.px(x, y, 14, 6, c); p.px(x + 12, y - 3, 5, 4, c); p.px(x + 14, y - 5, 1, 2, c); p.px(x + 1, y + 6, 2, 5, c); p.px(x + 10, y + 6, 2, 5, c); p.px(x - 2, y + 1, 2, 2, c); };   // a painted animal
      paint(140, 70, brick[3]); paint(150, 98, wood[4]); paint(122, 116, brick[3]);
      for (const [hx, hy] of [[176, 80], [168, 122]]) { p.px(hx, hy, 5, 5, paper[3]); for (let k = 0; k < 4; k++) p.px(hx + k + (k > 2 ? 1 : 0), hy - 3, 1, 3, paper[3]); }   // hand prints
      p.dith(200, GY - 60, 90, 60, wood[2]);                         // the firelight on the ground
      for (const x of [228, 236, 246, 254]) p.box(x, GY - 4, 6, 4, stone[2]);
      p.px(232, GY - 7, 22, 3, wood[1]);
      for (const [x, h] of [[380, 20], [430, 28], [520, 24], [600, 34]]) { p.disc(x, GY - h / 2, h / 2, leaf[0]); p.dith(x - h / 2, GY - h, h, h / 2, leaf[1]); }
      p.soil(wood[1], wood[0], wood[2], r, 600);
    },
    anim(b, f, t) {
      const q = Math.floor(t * 8) % 4;                             // the fire
      const fl = [[0, 0], [1, -1], [-1, 1], [0, -2]][q];
      f.tri(243 + fl[0], GY - 24 + fl[1], GY - 6, 7, brick[3]); f.tri(243 - fl[0], GY - 18 - fl[1], GY - 6, 5, gold[3]); f.tri(243, GY - 12 + fl[0], GY - 6, 3, gold[5]);
      if (q % 2) f.px(240 + fl[0] * 3, GY - 30, 1, 1, gold[4]);
      for (let k = 0; k < 6; k++) if (Math.floor(t * 2 + k * 7) % 5 === 0) b.px((k * 97 + 31) % WW, (k * 41) % 100, 1, 1, paper[5]);
    },
  },
  { // One in a Historillion: the hidden golden tomb, lit by torches, gold everywhere
    top: night[0], floor: stone[0], thumb: [296, 100],
    back(p, r) {
      p.px(0, 0, WW, GY, night[0]);
      for (let y = 0; y < GY; y += 10) { p.px(0, y, WW, 1, OUT); for (let x = (y / 10) % 2 ? 0 : 12; x < WW; x += 24) p.px(x, y, 1, 10, OUT); }
      p.speck(0, 0, WW, GY, 500, [night[1], stone[0]], r);
      for (let x = 20; x < WW; x += 60) p.dith(x, 0, 18, 6, gold[1]);
      for (let k = 0; k < 3; k++) { const x0 = 150 + k * 170; for (let y = 0; y < GY; y += 2) p.dith(x0 + y / 3, y, 16, 2, gold[1], y % 4 ? 1 : 0); }   // beams of light from cracks above
      for (let x = 10; x < WW; x += 16) {                          // a band of invented glyphs
        const k = Math.floor(r() * 4); p.px(x, 50, 10, 1, gold[1]); p.px(x, 66, 10, 1, gold[1]);
        if (k === 0) p.disc(x + 5, 58, 3, gold[2]); else if (k === 1) { p.px(x + 4, 53, 2, 11, gold[2]); p.px(x + 1, 57, 8, 2, gold[2]); } else if (k === 2) for (let q = 0; q < 8; q++) p.px(x + 1 + q, 56 + (q % 2) * 3, 1, 2, gold[2]); else p.tri(x + 5, 53, 64, 4, gold[2]);
      }
    },
    front(p, r) {
      for (const x of [40, 580]) { p.box(x, 20, 22, GY - 20, stone[1]); p.dith(x + 14, 20, 8, GY - 20, stone[0]); p.box(x - 4, 16, 30, 8, gold[2]); p.box(x - 4, GY - 8, 30, 8, gold[2]); }
      for (let k = 0; k < 3; k++) p.box(240 + k * 8, GY - 12 + k * 4, 160 - k * 16, 4, stone[2]);   // the dais
      const sx = 268, sw = 104;                                    // the sarcophagus with a golden mask on the lid
      p.box(sx, GY - 52, sw, 40, gold[3]); p.px(sx, GY - 52, sw, 3, gold[4]); p.dith(sx + sw - 20, GY - 52, 20, 40, gold[2]);
      for (let k = 0; k < 5; k++) p.px(sx + 8 + k * 20, GY - 42, 10, 22, gold[2]);
      p.box(sx - 4, GY - 58, sw + 8, 6, gold[4]);
      p.box(sx + 40, GY - 78, 24, 20, gold[3]); p.px(sx + 46, GY - 72, 4, 2, OUT); p.px(sx + 55, GY - 72, 4, 2, OUT); p.px(sx + 50, GY - 66, 4, 1, gold[1]); p.px(sx + 40, GY - 78, 24, 3, gold[4]); p.dith(sx + 56, GY - 78, 8, 20, gold[2]);
      const heap = (cx, w, h) => { for (let y = 0; y < h; y++) { const ww = Math.round(w * (y + 1) / h); p.px(cx - ww / 2, GY - h + y, ww, 1, y % 3 ? gold[3] : gold[2]); } p.speck(cx - w / 2, GY - h, w, h, w, [gold[4], gold[5]], r); };
      heap(150, 70, 18); heap(480, 80, 22); heap(210, 30, 8);
      p.box(110, GY - 22, 26, 16, wood[2]); p.px(110, GY - 22, 26, 3, gold[3]); p.px(121, GY - 16, 4, 4, gold[4]);   // chests and an urn
      p.box(520, GY - 26, 26, 18, wood[2]); p.px(520, GY - 26, 26, 3, gold[3]);
      p.disc(420, GY - 14, 7, teal[3]); p.px(417, GY - 26, 6, 6, teal[3]); p.px(415, GY - 26, 10, 2, gold[3]);
      for (const x of [200, 440]) { p.px(x, GY - 110, 4, 16, wood[2]); p.box(x - 2, GY - 112, 8, 3, gold[2]); }   // torch holders
      p.soil(stone[1], stone[0], stone[2], r, 300);
      for (let y = GY + 6; y < WH; y += 10) { p.px(0, y, WW, 1, OUT); for (let x = (y % 20) * 2; x < WW; x += 30) p.px(x, y, 1, 10, OUT); }
      p.speck(0, GY + 1, WW, WH - GY - 1, 160, [gold[2], gold[3]], r);
    },
    anim(b, f, t) {
      const q = Math.floor(t * 8) % 4;
      for (const x of [202, 442]) { const dx = [0, 1, -1, 0][q]; f.tri(x + dx, GY - 128 - (q % 2), GY - 112, 4, brick[3]); f.tri(x - dx, GY - 124, GY - 112, 3, gold[3]); f.px(x, GY - 118, 1, 4, gold[5]); f.dith(x - 10, GY - 132, 22, 24, gold[2], q % 2); }
      for (let k = 0; k < 8; k++) if (Math.floor(t * 3 + k * 5) % 4 === 0) { const x = (k * 83 + 40) % WW, y = GY - 4 - ((k * 29) % 70); f.px(x, y - 2, 1, 5, gold[5]); f.px(x - 2, y, 5, 1, gold[5]); }
    },
  },
];

// one find per answer at most: a thing from the world it was found in (12 x 12, o = outline). "none" turns up a plain rock.
const ITEMS = [
  { name: "Pocket watch", map: { o: OUT, g: gold[3], h: gold[4], d: gold[1], p: paper[5], k: OUT },
    rows: ["....oooo....", "....ohgo....", "..oooooooo..", ".oghhhhhhgo.", "ogpppkppppgo", "ogpppkppppgo", "ogpppkkkppgo", "ogppppppppgo", "ogppppppppgo", ".odppppppdo.", "..oddddddo..", "...oooooo..."] },
  { name: "Brass compass", map: { o: OUT, g: gold[2], h: gold[3], p: paper[4], r: brick[3], k: stone[1] },
    rows: ["...oooooo...", "..ohhhhhhoo.", ".ohpppppphgo", "ohppppprpphg", "ohpppprrpphg", "ohppppkpppgo", "ohpppkkppphg", "ohppkpppppgo", ".ogpppppphgo", "..ogggggggo.", "...oooooo...", "............"] },
  { name: "Knight's sword", map: { o: OUT, s: stone[4], w: stone[5], g: gold[2], h: gold[3], b: wood[2] },
    rows: ["..........oo", ".........oso", "........oswo", ".......oswo.", "......oswo..", ".....oswo...", "..o.oswo....", "..ohoswo....", "...ohho.....", "..obohho....", ".obo..oho...", "oo.........."] },
  { name: "Roman helmet", map: { o: OUT, r: brick[3], d: brick[2], g: gold[2], h: gold[3], k: gold[1] },
    rows: [".oooooooo...", "orrrrrrrro..", ".oddddddo...", "..ohhhhhho..", ".ohhhhhhhgo.", "ohhhhhhhhhgo", "ohhgooohhhgo", "ohgo...ohhgo", "ogko...okhgo", "ogko...okgo.", ".oo.....oo..", "............"] },
  { name: "Bronze axe", map: { o: OUT, g: gold[2], h: gold[3], k: gold[1], b: wood[2], c: wood[3] },
    rows: ["....oooo....", "...ohhhgo...", "..ohhhhkgo..", "..ohhgggko..", "...oooocbo..", ".......obco.", "........obco", ".........obo", "..........oo", "............", "............", "............"] },
  { name: "Flint hand axe", map: { o: OUT, s: stone[3], l: stone[4], d: stone[2] },
    rows: ["....oo......", "...olso.....", "...olsso....", "..olssdso...", "..olsdssso..", ".olssssdso..", ".olsdsssso..", ".osssssdso..", "..osdsssso..", "..odssddo...", "...oooooo...", "............"] },
  { name: "Golden mask", map: { o: OUT, g: gold[3], h: gold[4], d: gold[2], k: OUT, w: gold[5] },
    rows: ["...oooooo...", "..ohhhhhhgo.", ".ohhwhhhhhgo", ".ohhhhhhhhgo", ".ohkkhhkkhgo", ".ohhhhhhhhgo", ".ohhhhdhhhgo", "..ohhhhhhgo.", "..ohhkkhhgo.", "...ohhhhgo..", "....oddoo...", ".....oo....."] },
];
const ROCK = { name: "Plain rock", map: { o: OUT, s: stone[2], l: stone[3], d: stone[1] }, rows: ["............", "............", "............", "............", "....oooo....", "..oollsso...", ".olllsssdo..", ".olssssddo..", "ossssssddso.", "osssddddddo.", ".oooooooooo.", "............"] };

function itemCanvas(it) { const c = canvas(12, 12); pen(c.getContext("2d")).sprite(0, 0, it.rows, it.map); return c; }

// the worlds are drawn once, when first needed
const built = [];
function buildWorld(i) {
  if (built[i]) return built[i];
  const w = WORLDS[i];
  const back = canvas(WW, WH), front = canvas(WW, WH);
  w.back(pen(back.getContext("2d")), rng(7 + i * 31));
  w.front(pen(front.getContext("2d")), rng(3 + i * 17));
  return (built[i] = { back, front });
}

export function mountScene(parent = document.body, opts = {}) {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const still = () => opts.still || mq.matches;
  const sound = createSound();

  // ---- DOM: the back layer (slower), the moving things, the front layer, the find, the man ----
  const root = el("div", "wscene", { id: "scene" });
  root.setAttribute("aria-hidden", "true");
  const backBox = el("div", "wlayer");
  const frontBox = el("div", "wlayer");
  const backCv = canvas(WW, WH), animB = canvas(WW, WH), frontCv = canvas(WW, WH), animF = canvas(WW, WH);
  [backCv, animB, frontCv, animF].forEach((c) => c.classList.add("wcv"));
  const floor = el("div", "wfloor");                             // the ground goes on below the picture on tall screens
  const item = el("div", "witem");
  const man = el("div", "sprite man");
  const manWrap = el("div", "wman");
  manWrap.append(man);
  backBox.append(backCv);
  const pitCv = canvas(WW, WH);                                  // the pit and its spoil heap, redrawn as it deepens
  pitCv.classList.add("wcv");
  frontBox.append(animB, frontCv, animF, floor, pitCv, item, manWrap);
  const vignette = el("div", "vignette");
  const dust = el("div", "wdust");
  const flash = el("div", "wflash");
  const edge = el("div", "urgent-edge");
  root.append(backBox, frontBox, vignette, dust, flash, edge);
  // the world you are in: its name and years, and seven pips (the worlds reached today). The only "depth" readout while playing.
  const chip = el("div", "era-chip");
  const chipName = el("b"), chipYears = el("span"), pips = el("span", "pips");
  ERAS.forEach(() => pips.append(el("i")));
  chip.append(chipName, chipYears, pips);
  const title = el("div", "era-title");                          // the name of a new world, big for a moment
  const titleName = el("b"), titleYears = el("span");
  title.append(titleName, titleYears);
  const confetti = el("div", "confetti");                        // the top rank (celebrate): as in dig-scene.js
  confetti.hidden = true;
  confetti.setAttribute("aria-hidden", "true");
  for (let n = 0; n < 26; n++) {
    const bit = el("i");
    bit.style.setProperty("--x", `${(n * 37 + 11) % 100}%`);
    bit.style.setProperty("--y", `${(n * 53 + 7) % 90}%`);
    bit.style.setProperty("--d", `${3.2 + (n % 5) * 0.5}s`);
    bit.style.setProperty("--w", `${-(n % 9) * 0.35}s`);
    bit.style.setProperty("--c", [gold[3], brick[4], leaf[5], gold[4], paper[5], night[5]][n % 6]);
    confetti.append(bit);
  }
  const hudEl = el("div", "", { id: "hud" });
  parent.prepend(root, hudEl);
  parent.append(chip, title, confetti);

  // ---- state ----
  let depth = 0;                                                 // points today
  let finds = [];                                                // [{ key, points, depth, era }]
  let world = -1;                                                // the world on screen
  const manX = DIGX;                                             // his feet, in art px (he stays at his pit; the fly-over moves the camera)
  let fallY = 0;                                                 // he drops into the next world from above
  let pitD = 0;                                                  // the pit's depth on screen, art px
  let zoom = 0;                                                  // whole zoom steps added for rare / very rare
  let camOverride = null;                                        // the fly-over sets the camera itself
  let view = { s: 2, top: 0, bottom: 600, whole: false };
  const pitOf = (p) => {                                         // the pit for a score: the share of its era done (the tomb counts 120 points)
    const i = eraIndex(p), from = ERAS[i].from, to = ERAS[i + 1]?.from ?? from + 120;
    return Math.round(PITMAX * Math.min(1, (p - from) / (to - from)));
  };

  // ---- the pit: a dark hole with lit and shaded walls, a heap of spoil beside it that grows; near the bottom the next world's light glints through ----
  function drawPit(breaking = false) {
    const g = pitCv.getContext("2d");
    g.clearRect(0, 0, WW, WH);
    if (world < 0) return;
    const p = pen(g), [base, dk, lt] = DIRT[world], x0 = PIT_X, w = PIT_W, d = Math.round(pitD);
    const hh = Math.min(9, Math.round(d / 5));                   // the spoil heap right of the pit
    if (hh) { p.tri(x0 + w + 12, GY - hh - 1, GY, 11, OUT); p.tri(x0 + w + 12, GY - hh, GY, 10, base); p.dith(x0 + w + 12, GY - hh + 1, 10, hh - 1, dk); p.px(x0 + w + 9, GY - hh + 1, 3, 1, lt); }
    if (d < 2) { p.px(x0 + 6, GY, w - 12, 1, dk); p.px(x0 + 8, GY + 1, w - 16, 1, dk); if (world < ERAS.length - 1) p.dith(x0 - 3, GY + PITMAX + 1, w + 6, 1, gold[3]); return; }   // not dug yet: a scratch where he will dig
    p.px(x0 - 1, GY, w + 2, d + 1, OUT);
    p.px(x0, GY, w, d, night[0]);
    p.px(x0, GY, 3, d, base); p.dith(x0 + 3, GY, 2, d, base);  // the lit left wall
    p.px(x0 + w - 2, GY, 2, d, night[1]);                      // the shaded right wall
    for (let y = GY + 6; y < GY + d - 2; y += 7) p.px(x0, y, 3, 1, dk);   // pick marks
    p.px(x0 + 3, GY + d - 2, w - 5, 2, dk);                      // the floor
    p.px(x0 - 2, GY, 1, 1, lt); p.px(x0 + w + 1, GY, 1, 1, lt);
    if (world < ERAS.length - 1) p.dith(x0 - 3, GY + PITMAX + 1, w + 6, 1, gold[3]);   // a dotted gold line: the bottom of this world, where the next one starts
    if (world < ERAS.length - 1) {                               // the next world shines through as the floor gets thin
      const n = breaking ? 99 : Math.max(0, Math.round((d / PITMAX - 0.5) * 16));
      for (let k = 0; k < Math.min(n, w - 6); k++) p.px(x0 + 3 + ((k * 7) % (w - 6)), GY + d - 1, 1, 1, k % 3 ? gold[4] : gold[5]);
      if (breaking) { p.px(x0 + 3, GY + d - 2, w - 6, 2, gold[5]); p.dith(x0 + 2, GY + d - 6, w - 4, 4, gold[4]); }
    }
  }

  function setWorld(i) {
    if (i === world) return;
    world = i;
    const b = buildWorld(i);
    const gb = backCv.getContext("2d"), gf = frontCv.getContext("2d");
    gb.clearRect(0, 0, WW, WH); gb.drawImage(b.back, 0, 0);
    gf.clearRect(0, 0, WW, WH); gf.drawImage(b.front, 0, 0);
    root.style.background = WORLDS[i].top;                       // above the picture: its top sky colour
    floor.style.background = WORLDS[i].floor;
    root.dataset.world = i;
    chipName.textContent = ERAS[i].name;
    chipYears.textContent = ERAS[i].years;
    [...pips.children].forEach((n, k) => { n.className = k < i ? "done" : k === i ? "now" : ""; });
    chip.classList.toggle("gold", i === ERAS.length - 1);
    animate(true);
  }

  // ---- what moves in the world, 8 times a second (stopped with reduced motion: one frame) ----
  let animT = 14, animTimer = 0, slow = 1;                      // 14 s in: the train is in view on the first (and with reduced motion, only) frame
  function animate(once = false) {
    const gb = animB.getContext("2d"), gf = animF.getContext("2d");
    gb.clearRect(0, 0, WW, WH); gf.clearRect(0, 0, WW, WH);
    if (world >= 0) WORLDS[world].anim(pen(gb), pen(gf), animT);
    if (once) return;
    animT += 0.125 * slow;
  }
  function loop() { clearInterval(animTimer); if (!still()) animTimer = setInterval(() => { if (!document.hidden) animate(); }, 125); }

  // ---- the camera: the ground at 80 % of the free area, him at 40 % across (50 % when zoomed or on the intro / end screen); whole-pixel scale steps ----
  function camera() {
    const S = view.s + zoom;
    const vw = innerWidth, artW = vw / S;
    let cx = camOverride ?? manX + PIT_W / 2 - artW * 0.5;      // him and his pit in the middle
    cx = WW <= artW ? (WW - artW) / 2 : Math.min(Math.max(cx, 0), WW - artW);
    // the ground at 75 % of the free area, but high enough that the whole pit (to the bottom of this world) shows, and never his head under the question
    let feet = view.whole ? view.bottom - (PITMAX + 4) * view.s : Math.min(view.top + (view.bottom - view.top) * 0.75, view.bottom - (PITMAX + 2) * S);
    feet = Math.max(feet, view.top + 40 * S);
    const ty = Math.round(feet - FEET * S);
    frontBox.style.transform = `translate(${Math.round(-cx * S)}px, ${ty}px) scale(${S})`;
    backBox.style.transform = `translate(${Math.round(-cx * 0.6 * S)}px, ${ty}px) scale(${S})`;   // the back layer moves slower: depth
    manWrap.style.translate = `${manX - (anchor[0] + 2)}px ${FEET - (anchor[1] + 4) + fallY}px`;
    item.style.translate = `${PIT_X + PIT_W / 2 - 6}px ${GY - 16}px`;   // the find sits on the rim of the pit
    root.style.setProperty("--pitx", `${Math.round((manX - cx) * S)}px`);     // the vignette (theme.css) closes round him
    root.style.setProperty("--pity", `${Math.round(ty + (FEET - 16) * S)}px`);
    root.style.setProperty("--vigr", `${30 * S}px`);
    root.style.setProperty("--s", S);
  }

  // ---- the man ----
  let anchor = [52, 88];
  function play(row, seconds, mode) {                            // mode: "once" | "loop"
    const [r, n, ax, ay] = MAN[row];
    anchor = [ax, ay];
    man.style.setProperty("--row", r);
    man.style.setProperty("--n", n);
    man.style.setProperty("--n1", n - 1);
    man.style.setProperty("--dur", `${seconds}s`);
    man.style.setProperty("--last", mode === "loop" ? 0 : n - 1);
    man.classList.remove("once", "loop", "still");
    void man.offsetWidth;
    man.classList.add(still() ? "still" : mode);
    camera();
  }

  // ---- the find of this answer: one thing from this world (a rock for "none"), next to him, until the next question ----
  function showItem(k, i, pop) {
    const it = k === "none" ? ROCK : ITEMS[i];
    item.replaceChildren(itemCanvas(it));
    item.className = `witem on ${k}${pop && !still() ? " pop" : ""}`;
  }
  const hideItem = () => { item.className = "witem"; };

  const retrigger = (n, cls) => { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); };
  function showTitle(i) { titleName.textContent = ERAS[i].name; titleYears.textContent = ERAS[i].years; title.classList.toggle("gold", i === ERAS.length - 1); retrigger(title, "on"); }

  // ---- the beat after an answer ----
  let skip = null;
  let timers = [];
  const later = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
  const fade = (n, values, ms) => values.forEach((v, i) => timers.push(setTimeout(() => (n.style.opacity = v), i * ms)));   // the dust cloud / the flash, in steps
  function fall(fromY, toY, ms) {                                // he sinks into the pit / drops into the new world
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        const u = Math.min(1, (performance.now() - t0) / ms);
        fallY = Math.round(fromY + (toY - fromY) * u * u);
        camera();
        if (u < 1) timers.push(setTimeout(tick, 16)); else resolve();
      };
      tick();
    });
  }
  function dig(key, points = 0) {
    finish();
    document.body.classList.add("phase-feedback");               // the question shrinks, the big word shows (layout-phone.css)
    const k = KEYS.has(key) ? key : "none";
    const from = depth, to = depth + Math.max(0, points || 0);
    depth = to;
    const last = eraIndex(to);
    let ended = false;
    return new Promise((resolve) => {
      const done = () => {                                       // the end state: the world of the new score, the pit at its depth, the find on its rim, his reaction
        if (ended) return;
        ended = true;
        timers.forEach(clearTimeout); timers = [];
        removeEventListener("keydown", skip, true);
        removeEventListener("pointerdown", skip, true);
        skip = null;
        root.classList.remove("rumble", "dim", "dim-strong");
        dust.style.opacity = 0;
        if (Number(flash.style.opacity) > 0 && Number(flash.style.opacity) < 0.95) flash.style.opacity = 0;   // skipped mid-transition: no veil left behind
        slow = 1;
        fallY = 0;
        setWorld(last);
        pitD = pitOf(to);
        drawPit();
        zoom = k === "rare" || k === "veryRare" ? 1 : 0;        // rare and very rare stay a step closer until the next question
        root.classList.toggle("dim-tight", zoom > 0 && !still());
        finds.push({ key: k, points, depth: to, era: last });
        showItem(k, last, true);
        play(`rx_${k}`, 0.5, "once");
        sound.play(`reveal-${k}`);
        resolve({ depth: to, era: ERAS[last].name });
      };
      if (still()) return done();
      skip = done;
      addEventListener("keydown", skip, { capture: true, once: true });
      addEventListener("pointerdown", skip, { capture: true, once: true });
      let hits = 0;
      const strokes = async (d1, n, gap) => {                    // n swings of the pickaxe; each one takes the pit a step deeper
        const d0 = pitD;
        play("dig", gap * 1.6, "loop");
        for (let q = 1; q <= n; q++) {
          await later(gap * 1000 * 0.6); if (ended) return;
          sound.play("hit", hits++);
          pitD = d0 + ((d1 - d0) * q) / n;
          drawPit();
          await later(gap * 1000 * 0.4); if (ended) return;
        }
      };
      (async () => {
        const n = { none: 2, common: 3, uncommon: 4, rare: 5, veryRare: 6 }[k];   // more points, more swings
        let i = eraIndex(from);
        while (i < last) {                                       // dig through the bottom of this world, jump in, drop into the next
          await strokes(PITMAX, 3, 0.26); if (ended) return;
          drawPit(true);                                         // the floor breaks: the light of the older world comes up
          sound.play("rumble"); root.classList.add("rumble");
          [0.6, 0.4, 0.2, 0].forEach((v, q) => timers.push(setTimeout(() => (flash.style.opacity = v), q * 90)));
          play("ready", 0.3, "once");
          await later(380); if (ended) return;
          root.classList.remove("rumble");
          sound.play("layer");
          fade(dust, [0.5, 1, 1, 1, 0.7, 0.4, 0.15, 0], 90);
          await fall(0, 40, 240); if (ended) return;             // he jumps into the pit
          i++;
          setWorld(i);
          pitD = 0;
          drawPit();
          fallY = -170;
          showTitle(i);
          await later(160); if (ended) return;
          await fall(-170, 0, 380); if (ended) return;           // and lands in the older world, on fresh ground
          sound.play("thud");
          play("idle", 2.4, "loop");
          await later(350); if (ended) return;
        }
        const target = pitOf(to);
        if (k === "rare") { zoom = 1; root.classList.add("dim", "dim-tight"); camera(); sound.play("thud"); }
        if (k === "veryRare") {                                  // the camera dives in two steps, the screen goes dark round him, the last swings in slow motion
          sound.play("swell-rare");
          root.classList.add("rumble", "dim", "dim-strong");
          zoom = 1; camera(); await later(250); if (ended) return;
          zoom = 2; slow = 0.35; camera(); sound.play("thud");
          await strokes(pitD + (target - pitD) * 0.6, 3, 0.32); if (ended) return;
          await strokes(target, 3, 0.6); if (ended) return;
          root.classList.remove("rumble", "dim-strong");
          [0.95, 0.75, 0.5, 0.25, 0].forEach((v, q) => setTimeout(() => (flash.style.opacity = v), q * 120));   // not on `timers`: it fades out after done()
          sound.play("finish");                                  // the fanfare (with the very rare reveal sound in done())
          return done();
        }
        await strokes(target, n, k === "rare" ? 0.36 : 0.3); if (ended) return;
        if (k === "uncommon") { root.classList.add("rumble"); timers.push(setTimeout(() => root.classList.remove("rumble"), 300)); }
        if (k === "rare") [0.6, 0.4, 0.2, 0].forEach((v, q) => setTimeout(() => (flash.style.opacity = v), q * 90));
        await later(120);
        done();
      })();
    });
  }
  function finish() { if (skip) skip(); }

  // ---- idle, day ----
  function calm() {
    finish();
    document.body.classList.remove("phase-feedback");
    celebrate(false); urgent(false);
    zoom = 0; slow = 1;
    root.classList.remove("dim", "dim-strong", "dim-tight");
    hideItem();
    camera();
  }
  function idle() { calm(); play("idle", 2.4, "loop"); }
  function ready() { calm(); play("ready", 1.2, "once"); }
  function newDay() { finish(); depth = 0; finds = []; setWorld(0); pitD = 0; drawPit(); idle(); }
  function setDay(list = []) {
    finish();
    depth = 0;
    finds = [];
    for (const { key, points } of list) { depth += Math.max(0, points || 0); finds.push({ key: KEYS.has(key) ? key : "none", points, depth, era: eraIndex(depth) }); }
    setWorld(eraIndex(depth));
    pitD = pitOf(depth);
    drawPit();
    idle();
  }
  function urgent(on) { document.body.classList.toggle("urgent", !!on); edge.classList.toggle("on", !!on); }
  function celebrate(on = true) {
    document.body.classList.toggle("celebrate", !!on);
    confetti.hidden = !on;
    if (on) { sound.play("reveal-veryRare"); play("rx_veryRare", 1.0, still() ? "once" : "loop"); }
  }

  // ---- the end screen: a short fly-over of the world you reached, from its far end back to him ----
  let flyTimer = 0;
  function flyover() {
    clearTimeout(flyTimer);
    if (still()) return;
    const artW = innerWidth / view.s;
    const a = manX > WW / 2 ? 0 : WW - artW, b = manX - artW / 2, t0 = performance.now(), dur = 2600;
    const tick = () => {
      const u = Math.min(1, (performance.now() - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      camOverride = a + (b - a) * e;
      camera();
      if (u < 1) flyTimer = setTimeout(tick, 16); else { camOverride = null; camera(); }
    };
    tick();
  }

  // ---- the top bar (as in dig-scene.js) ----
  const soundBtn = el("button", "hud-sound", { type: "button" });
  const paintSound = () => {
    soundBtn.replaceChildren(speaker(sound.muted));
    soundBtn.setAttribute("aria-pressed", String(!sound.muted));
    soundBtn.setAttribute("aria-label", soundBtn.dataset.label || "Sound");
    soundBtn.classList.toggle("is-muted", sound.muted);
  };
  soundBtn.addEventListener("click", () => { sound.toggle(); paintSound(); });
  sound.onChange(paintSound);
  function hud(info) {
    if (!info) {
      const wasShown = !hudEl.hidden;
      urgent(false); hudEl.hidden = true; document.body.classList.add("no-hud"); fit();
      if (wasShown && depth > 0) flyover();                      // from the last question to the end screen
      return;
    }
    clearTimeout(flyTimer); camOverride = null;
    hudEl.hidden = false;
    document.body.classList.remove("no-hud");
    soundBtn.dataset.label = info.soundLabel ?? "Sound";
    paintSound();
    const row = el("div", "hud-row");
    const left = el("div", "hud-left");
    const hchip = el("p", "hud-chip", { textContent: info.chip ?? "" });
    hchip.hidden = !info.chip;
    left.append(soundBtn, hchip);
    const q = el("p", "hud-q");
    q.append(el("span", "sr", { textContent: info.counter ?? "" }));
    if (info.progress) {
      const sq = el("span", "squares");
      sq.setAttribute("aria-hidden", "true");
      for (let n = 1; n <= info.progress.total; n++) sq.append(el("i", n < info.progress.current ? "sq done" : n === info.progress.current ? "sq now" : "sq"));
      q.append(sq);
    } else q.append(el("span", "txt", { textContent: info.counter ?? "" }));
    row.append(left, q, el("p", "hud-score", { textContent: info.score ?? "" }));
    hudEl.replaceChildren(row, ...(info.timer ? [info.timer] : []));
    fit();
  }

  // ---- fit: the free area between the question and the answer bar (v10 layout); on the intro / end screen the whole screen ----
  function fit() {
    const vv = visualViewport;
    const vw = innerWidth;
    const vh = vv ? vv.height : innerHeight;
    const rs = document.documentElement.style;
    const kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
    rs.setProperty("--kb", `${kb}px`);
    rs.setProperty("--vh", `${vh}px`);
    document.documentElement.classList.toggle("compact", vh < 560);
    const hudBottom = hudEl.hidden ? 12 : Math.ceil(hudEl.getBoundingClientRect().bottom);
    rs.setProperty("--ptop", `${hudBottom + 10}px`);
    const mainEl = document.querySelector("main");
    const whole = hudEl.hidden || document.body.classList.contains("phase-end");
    let top = 0, bottom = vh;
    if (!whole && mainEl) {
      // top: under the question (and "your answer"); bottom: above the answer bar / Next / hint, or above the result strip after an answer (world.css)
      const kids = [...mainEl.children].filter((n) => n.getClientRects().length);
      const flow = kids.filter((n) => getComputedStyle(n).position === "static" && !n.matches(".rarity-word, .points, .explain"));
      top = Math.max(hudBottom + 6, ...flow.map((n) => Math.ceil(n.getBoundingClientRect().bottom) + 6));
      const bars = kids.filter((n) => n.matches("form, button, .msg, .rarity-word")).map((n) => n.getBoundingClientRect().top);
      bottom = (bars.length ? Math.min(...bars) : vh - 8) - 8;
    }
    rs.setProperty("--qb", `${top}px`);
    const s = Math.max(vw < 700 ? 2 : 3, Math.ceil(vw / WW));    // 2 screen px per art px on a phone, 3 on a big screen; never narrower than the screen
    view = { s, top, bottom, whole };
    chip.hidden = whole || bottom - top < 110;
    title.hidden = whole;
    camera();
  }
  addEventListener("resize", fit);
  visualViewport?.addEventListener("resize", fit);
  const refit = () => requestAnimationFrame(fit);
  const mainNode = document.querySelector("main");
  if (mainNode) { new MutationObserver(refit).observe(mainNode, { childList: true, subtree: true, characterData: true }); if (window.ResizeObserver) new ResizeObserver(refit).observe(mainNode); }
  new MutationObserver(refit).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  mq.addEventListener?.("change", loop);

  hudEl.hidden = true;
  setWorld(0);
  drawPit();
  idle();
  fit();
  loop();
  return {
    hud, idle, ready, dig, reset: idle, fit, sound, newDay, setDay, urgent, celebrate, finish,
    get depth() { return depth; },
    get finds() { return finds.map(({ key, points, depth, era }) => ({ key, points, depth, era })); },
  };
}

// The end screen's strip of worlds: the seven worlds in a row, the ones reached today in colour (a gold dot per find made there),
// the farthest framed in gold, the ones not reached yet dark with a "?". The start for a share picture.
//   import { coreSample } from "../kit-b/world-scene.js";
//   show(coreSample({ finds: scene.finds, depth: total }), el("h1", ...), ...)          // label: (points, era name, finds) => the text a screen reader hears
export function coreSample({ finds = [], depth = 0, label = (p, era, n) => `Today's dig reached ${era} with ${n} finds` } = {}) {
  const far = eraIndex(depth);
  const fig = el("figure", "wstrip");
  fig.setAttribute("role", "img");
  fig.setAttribute("aria-label", label(depth, ERAS[far].name, finds.filter((f) => f.key !== "none").length));
  const TW = 44, TH = 60;                                        // a tile: 44 x 60 art px around the world's landmark, at 1 screen px per art px
  ERAS.forEach((e, i) => {
    const tile = el("div", i < far ? "wtile" : i === far ? "wtile far" : "wtile locked");
    if (i <= far) {
      const b = buildWorld(i), c = canvas(TW, TH), g = c.getContext("2d");
      const [x, y] = WORLDS[i].thumb;                            // the top-left of the crop round its landmark (back and front unshifted)
      g.drawImage(b.back, x, y, TW, TH, 0, 0, TW, TH);
      g.drawImage(b.front, x, y, TW, TH, 0, 0, TW, TH);
      tile.append(c);
      const dots = el("span", "wdots");
      finds.filter((f) => (f.era ?? eraIndex(f.depth)) === i && f.key !== "none").forEach(() => dots.append(el("i")));
      tile.append(dots);
    } else tile.append(el("b", "", { textContent: "?" }));
    fig.append(tile);
  });
  const cap = el("figcaption", "", {});
  cap.append(el("b", "", { textContent: ERAS[far].name }), el("span", "", { textContent: ERAS[far].years }));
  fig.append(cap);
  return fig;
}
