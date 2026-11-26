// Historillion, 2D kit v11: the cross-section dig. ONE idea: a side view of the ground, one layer per era, deeper = rarer.
// Each answer digs the day's shaft further down by its points (1 point = 1 m, 700 m = the bottom); the find of that answer stays in the shaft wall at the depth
// it was found. The total score IS the depth. Replaces dig-scene.js (same top bar, same sound, same phone layout of v10).
//
//   import { mountScene, ERAS, eraAt } from "../kit-b/shaft-scene.js";
//   const scene = mountScene(document.body);
//   scene.hud({ progress, counter, score, timer, chip, soundLabel }) / scene.hud(null)       // as before (null = intro / end screen: the whole shaft of the day shows)
//   scene.ready() / scene.idle() / scene.reset()                                               // question 1 / every other question / = idle
//   await scene.dig(key, points)     // digs `points` metres (key: common | uncommon | rare | veryRare | none); resolves when the find is out of the ground (remove .wait then)
//   scene.newDay() / scene.setDay([{ key, points }, ...])                                      // empty shaft / restore a stored day (no animation)
//   scene.depth / scene.finds        // metres dug today / [{ key, points, depth }]
//   scene.urgent(on) / scene.celebrate(on) / scene.sound / scene.fit()
// Any key press or tap during a dig jumps to its end state; Next and the input are never blocked. prefers-reduced-motion: the end state at once.

import { createSound } from "./sound.js";

// the layers, young (top) to old (bottom); depth in metres; colours from the channel palette (base, dark, light)
export const ERAS = [
  { from: 0, to: 100, name: "Modern", years: "1800 to now", c: ["#683a2c", "#482626", "#8e5434"] },
  { from: 100, to: 200, name: "Early modern", years: "1500 to 1800", c: ["#8e5434", "#683a2c", "#b87a44"] },
  { from: 200, to: 320, name: "Medieval", years: "500 to 1500", c: ["#962c34", "#62202e", "#cc3e3c"] },
  { from: 320, to: 450, name: "Roman & Classical", years: "800 BC to AD 500", c: ["#8c7468", "#5a464a", "#bea880"] },
  { from: 450, to: 580, name: "Bronze & Iron Age", years: "3300 to 800 BC", c: ["#5c5270", "#3e3652", "#827a96"] },
  { from: 580, to: 700, name: "Stone Age", years: "before 3300 BC", c: ["#2e1e56", "#1e1846", "#442662"] },
];
export const BOTTOM = 700;                                       // "One in a Historillion"
export const eraAt = (m) => ERAS.find((e) => m < e.to) ?? { name: "The bottom", years: "One in a Historillion" };

const FIND = { common: 0, uncommon: 1, rare: 2, veryRare: 3, none: 4 };   // column in scene/slots.png (shard, coin, crown, statue, rock)
const MAN = { idle: [0, 4, 52, 88], ready: [6, 6, 52, 88], dig: [8, 8, 76, 80], rx_none: [14, 8, 76, 80], rx_common: [15, 8, 76, 80], rx_uncommon: [16, 8, 76, 80], rx_rare: [17, 8, 76, 80], rx_veryRare: [18, 8, 76, 80] };   // row, frames, feet x, feet y in man.png

// the picture, in art pixels
const W = 640, SKY = 40, K = 0.5;                                // ground level at y 40; half an art pixel per metre: 700 m = 350 px
const H = SKY + BOTTOM * K + 24;
const SX0 = 294, SX1 = 346;                                      // the shaft (52 px wide: the archaeologist fits in it)
const yOf = (m) => SKY + Math.round(m * K);

function el(tag, className, props = {}) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  Object.assign(n, props);
  return n;
}

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

// a small deterministic random, so the layers look the same every time
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// the ground: sky strip, grass, the six layers with texture, the bedrock. Drawn once.
function drawGround() {
  const cv = el("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  const r = rng(11);
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // sky at dusk: stripes, no gradients (palette only)
  [["#1e1846", 0, 10], ["#2e1e56", 10, 7], ["#5c3068", 17, 5], ["#962c34", 22, 4], ["#cc3e3c", 26, 3], ["#ec6e5a", 29, 2]].forEach(([c, y, h]) => px(0, y, W, h, c));
  for (let x = 0; x < W; x++) {                                  // far hills
    const h = Math.round(4 + 3 * Math.sin(x / 37) + 2 * Math.sin(x / 13 + 1));
    px(x, 31 - h, 1, h + 3, "#2e1e56");
  }
  px(0, 31, W, 9, "#3c7838");                                    // grass
  for (let x = 0; x < W; x += 3) if (r() < 0.6) px(x, 30 - Math.floor(r() * 2), 1, 2, "#68a048");
  // the layers
  for (const e of ERAS) {
    const y0 = yOf(e.from), y1 = yOf(e.to);
    px(0, y0, W, y1 - y0, e.c[0]);
    for (let i = 0; i < (y1 - y0) * W / 18; i++) {               // speckle and pebbles
      const x = Math.floor(r() * W), y = y0 + 1 + Math.floor(r() * (y1 - y0 - 2));
      const big = r() < 0.12;
      px(x, y, big ? 2 : 1, big ? 2 : 1, r() < 0.5 ? e.c[1] : e.c[2]);
    }
    for (let x = 0; x < W; x++) {                                // a wavy boundary: a dark line under a light one
      const w = Math.round(Math.sin(x / 9 + e.from) * 1.2);
      px(x, y0 + w, 1, 1, e.c[2]);
      if (e.from) px(x, y0 + w - 1, 1, 1, "#0e0a18");
    }
  }
  for (let m = 0; m <= BOTTOM; m += 50) {                        // the ruler right of the shaft: a tick every 50 m, a longer one every 100 m
    px(SX1 + 4, yOf(m), m % 100 ? 3 : 6, 1, "#0e0a18");
  }
  px(SX1 + 4, SKY, 1, BOTTOM * K, "#0e0a18");
  px(0, yOf(BOTTOM), W, H - yOf(BOTTOM), "#28223a");             // the bedrock, with a glint of gold
  for (let i = 0; i < 160; i++) px(Math.floor(r() * W), yOf(BOTTOM) + 2 + Math.floor(r() * 20), 1, 1, r() < 0.15 ? "#ffd038" : "#3e3652");
  return cv;
}

export function mountScene(parent = document.body, opts = {}) {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const still = () => opts.still || mq.matches;
  const sound = createSound();
  const ground = drawGround();

  // ---- DOM ----
  const root = el("div", "shaft", { id: "scene" });
  root.setAttribute("aria-hidden", "true");
  const world = el("div", "sworld");                             // art pixels, scaled by --s, moved by the camera
  const cv = el("canvas", "sground");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  const eraLabels = ERAS.map((e) => { const n = el("div", "era-label", { textContent: e.name }); n.style.top = `${yOf(e.from) + 3}px`; return n; });
  const bottomLabel = el("div", "era-label bottom", { textContent: "700 m" });
  bottomLabel.style.top = `${yOf(BOTTOM) + 3}px`;
  const findsBox = el("div", "sfinds");
  const man = el("div", "sprite man");
  const manWrap = el("div", "sman");
  manWrap.append(man);
  world.append(cv, ...eraLabels, bottomLabel, findsBox, manWrap);
  const meter = el("div", "depth-meter");                        // the depth, at the side: "439 m" and the layer
  const meterM = el("b");
  const meterEra = el("span");
  meter.append(meterM, meterEra);
  const edge = el("div", "urgent-edge");
  root.append(world, edge);
  const hudEl = el("div", "", { id: "hud" });
  parent.prepend(root, hudEl);
  parent.append(meter);

  // ---- state ----
  let depth = 0;                                                 // metres dug today (the bottom of the shaft)
  let shown = 0;                                                 // the depth drawn right now (it runs behind depth during a dig)
  let finds = [];                                                // [{ key, points, depth }]
  let view = { s: 3, ox: 0, top: 0, bottom: 600, whole: false };

  function draw() {
    g.drawImage(ground, 0, 0);
    const y1 = yOf(shown) + 6;                                   // the shaft: dark, lit edges, a rope down the left wall; 6 px deep even before the first dig
    g.fillStyle = "#0a0c22"; g.fillRect(SX0, SKY - 1, SX1 - SX0, y1 - SKY + 1);
    g.fillStyle = "#121234"; g.fillRect(SX0, SKY - 1, 2, y1 - SKY + 1); g.fillRect(SX1 - 2, SKY - 1, 2, y1 - SKY + 1);
    g.fillStyle = "#0e0a18"; g.fillRect(SX0 - 1, SKY - 1, 1, y1 - SKY + 2); g.fillRect(SX1, SKY - 1, 1, y1 - SKY + 2); g.fillRect(SX0 - 1, y1, SX1 - SX0 + 2, 1);
    g.fillStyle = "#bea880"; g.fillRect(SX0 + 4, SKY - 4, 1, y1 - SKY);   // the rope
    g.fillStyle = "#683a2c"; g.fillRect(SX0 + 3, SKY - 6, 3, 4);           // its stake
    g.fillStyle = "#8e5434"; g.fillRect(SX0 - 16, SKY - 3, 12, 3); g.fillRect(SX0 - 13, SKY - 5, 7, 2);   // a small spoil heap at the mouth
  }

  // ---- the camera: the bottom of the shaft at 60 % of the free area; whole-pixel steps so the art stays crisp ----
  function camera() {
    const { s } = view;
    let ty;
    if (view.whole) ty = Math.round(view.bottom - 16 - (yOf(depth) + 34) * s);   // the whole shaft of the day, its bottom near the bottom of the screen (behind the end panel)
    else ty = Math.round(view.top + (view.bottom - view.top) * 0.6 - yOf(shown) * s);
    ty = Math.max(ty, view.bottom - H * s);                      // never past the bedrock
    world.style.transform = `translate(${view.ox}px, ${ty - (ty % s)}px) scale(${s})`;
    manWrap.style.translate = `${(SX0 + SX1) / 2 - anchor[0] - 2}px ${yOf(shown) + 6 - anchor[1] - 4}px`;   // .man sits at (2, 4) in its wrapper (theme.css)
    const e = eraAt(shown);
    meterM.textContent = `${Math.round(shown)} m`;
    meterEra.textContent = e.name;
    meter.dataset.era = String(ERAS.indexOf(e));
    eraLabels.forEach((n, i) => n.classList.toggle("here", ERAS[i] === e));
  }

  // ---- sprites ----
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
  function placeFinds(popLast) {
    findsBox.replaceChildren();
    finds.forEach((f, i) => {
      const same = finds.slice(0, i).filter((o) => Math.abs(o.depth - f.depth) < 20).length;   // finds at (almost) the same depth sit side by side
      const n = el("div", "sfind");
      n.style.setProperty("--k", FIND[f.key] ?? 4);
      n.style.left = `${SX0 - 16 - same * 15}px`;                // in the LEFT wall (the depth meter and the layer names are on the right)
      n.style.top = `${yOf(f.depth) - 24}px`;
      n.dataset.key = f.key;
      if (popLast && i === finds.length - 1 && !still()) n.classList.add("pop");
      findsBox.append(n);
    });
  }

  // ---- the beat after an answer ----
  let skip = null;
  let raf = 0;
  function dig(key, points = 0) {
    finish();
    document.body.classList.add("phase-feedback");               // the question shrinks, the big word shows (layout-phone.css)
    const k = FIND[key] !== undefined ? key : "none";
    const from = depth;
    const to = Math.min(BOTTOM, depth + Math.max(0, points));
    depth = to;
    const big = k === "rare" || k === "veryRare";
    return new Promise((resolve) => {
      const done = () => {                                       // the end state: the shaft at its new depth, the find in the wall, his reaction
        clearTimeout(raf);
        root.classList.remove("rumble");
        removeEventListener("keydown", skip, true);
        removeEventListener("pointerdown", skip, true);
        skip = null;
        shown = to;
        draw();
        finds.push({ key: k, points, depth: to });
        placeFinds(true);
        play(`rx_${k}`, 0.5, "once");
        sound.play(`reveal-${k}`);
        resolve({ depth: to, era: eraAt(to).name });
      };
      if (still()) return done();
      skip = done;
      addEventListener("keydown", skip, { capture: true, once: true });
      addEventListener("pointerdown", skip, { capture: true, once: true });
      const lead = 0.3;                                          // he raises the pickaxe
      const dur = to > from ? 0.9 + 1.3 * Math.min(to - from, 100) / 100 : 0.4;   // common: a short step (about 1 s), very rare: a long drop (about 2.1 s)
      play("dig", big ? 0.45 : 0.7, "loop");
      if (big) { root.classList.add("rumble"); sound.play("rumble"); }
      let t0 = 0, era = eraAt(from), hits = 0;
      const tick = () => {                                     // a timer, not requestAnimationFrame: it also runs in headless screenshots and keeps time when frames drop
        const now = performance.now();
        t0 ||= now;
        const t = (now - t0) / 1000 - lead;
        const u = Math.min(Math.max(t / dur, 0), 1);
        shown = from + (to - from) * (big ? u * u : 1 - (1 - u) * (1 - u));   // rare: it speeds up as it goes; common: it slows to a stop
        if (Math.floor(Math.max(t, 0) / (big ? 0.45 : 0.7)) >= hits && u < 1) { sound.play("hit", hits); hits++; }
        const e = eraAt(shown);
        if (e !== era) { era = e; sound.play("layer"); meter.classList.remove("new"); void meter.offsetWidth; meter.classList.add("new"); }
        draw();
        camera();
        if (u < 1) raf = setTimeout(tick, 16);
        else setTimeout(() => skip && done(), 120);
      };
      raf = setTimeout(tick, 16);
    });
  }
  function finish() { if (skip) skip(); }

  // ---- idle, day ----
  function idle() { finish(); document.body.classList.remove("phase-feedback"); celebrate(false); urgent(false); play("idle", 2.4, "loop"); }
  function ready() { finish(); document.body.classList.remove("phase-feedback"); celebrate(false); urgent(false); play("ready", 1.2, "once"); }
  function newDay() { finish(); depth = shown = 0; finds = []; placeFinds(false); draw(); idle(); }
  function setDay(list = []) {
    finish();
    depth = 0;
    finds = [];
    for (const { key, points } of list) { depth = Math.min(BOTTOM, depth + Math.max(0, points || 0)); finds.push({ key: FIND[key] !== undefined ? key : "none", points, depth }); }
    shown = depth;
    placeFinds(false);
    draw();
    idle();
  }
  function urgent(on) { document.body.classList.toggle("urgent", !!on); edge.classList.toggle("on", !!on); }
  function celebrate(on = true) {
    document.body.classList.toggle("celebrate", !!on);
    if (on) { sound.play("reveal-veryRare"); play("rx_veryRare", 1.0, still() ? "once" : "loop"); }
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
    if (!info) { urgent(false); hudEl.hidden = true; document.body.classList.add("no-hud"); return fit(); }
    hudEl.hidden = false;
    document.body.classList.remove("no-hud");
    soundBtn.dataset.label = info.soundLabel ?? "Sound";
    paintSound();
    const row = el("div", "hud-row");
    const left = el("div", "hud-left");
    const chip = el("p", "hud-chip", { textContent: info.chip ?? "" });
    chip.hidden = !info.chip;
    left.append(soundBtn, chip);
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

  // ---- fit: the free area between the question text and the bottom bar (v10 layout); on the intro / end screen the whole shaft of the day ----
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
      top = Math.max(hudBottom + 6, Math.ceil(mainEl.getBoundingClientRect().bottom) + 6);
      const bars = [...mainEl.querySelectorAll(":scope > form, :scope > button, :scope > .msg")].filter((n) => n.getClientRects().length).map((n) => n.getBoundingClientRect().top);
      bottom = (bars.length ? Math.min(...bars) : vh - 8) - 8;
    }
    const sw = Math.max(2, Math.min(4, Math.floor(vw / 120)));
    const s = whole ? Math.max(2, Math.min(sw, Math.floor(vh / (yOf(depth) + 40)))) : sw;
    view = { s, ox: Math.round(vw / 2 - (W / 2) * s), top, bottom, whole };
    root.style.setProperty("--s", s);
    const fs = (v) => `${v}px`;
    meter.style.top = fs(Math.round(top + (bottom - top) * 0.6 - 44));   // level with the bottom of the shaft (the camera keeps it at 60 % of the free area)
    meter.hidden = whole;
    camera();
  }
  addEventListener("resize", fit);
  visualViewport?.addEventListener("resize", fit);
  const refit = () => requestAnimationFrame(fit);
  const mainNode = document.querySelector("main");
  if (mainNode) { new MutationObserver(refit).observe(mainNode, { childList: true, subtree: true, characterData: true }); if (window.ResizeObserver) new ResizeObserver(refit).observe(mainNode); }
  new MutationObserver(refit).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  hudEl.hidden = true;
  draw();
  idle();
  fit();
  return { hud, idle, ready, dig, reset: idle, fit, sound, newDay, setDay, urgent, celebrate, finish, get depth() { return depth; }, get finds() { return finds.map((f) => ({ ...f })); } };
}
