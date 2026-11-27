// Fullscreen dig scene for Historillion (2D kit). v15: one square per answer, as archaeologists really work (field.js). A rectangular excavation laid
// out with strings on pegs in 7 squares (4 at the back, 3 in front), in a 3/4 view, with the camp (tent, find table) behind and the ruins. All squares start
// closed; each answer he walks to the next square and digs it open: the more points (0 to 100), the deeper, and the older the layer at its bottom. The find
// comes out of that bottom layer and goes onto the find table with a white number tag. The camera follows his square; the end screen shows the whole field,
// all 7 squares with their own depth, like a small chart in the ground.
//   v15:  const p = await scene.dig(key, points)                  // or dig(key, points, { label, benchLabel, findName }); points of THIS answer (0 to 100); resolves when the find is up
//         scene.setDay([{ key, points }, ...])                    // restore a stored day: every square at its depth, the finds on the table (no animation)
//         scene.depth / scene.finds                               // points today / one per square: [{ key, points, era, find, square }]
//         ERAS, eraAt(points)                                     // the layers and their borders in points of one answer (field.js)
//   the old call dig(key, label, benchLabel, findName) still works (it digs 0 points deeper).
//
//   import { mountScene, museum, DIG, REACTIONS } from "./kit-b/dig-scene.js";
//   const scene = mountScene();                                  // once at start-up: adds #scene (artwork) and #hud (top bar) before <main id="app">
//   scene.hud({ progress: { current: 3, total: 7 }, counter: t.question(3, 7), score: t.scoreLabel(total), timer, chip, soundLabel })
//   scene.hud(null)                                              // hide the bar (intro, end screen)
//   scene.ready()                                                // question 1 only: a quiet start beat (he looks around and settles his hat), about 1.2 s
//   scene.idle()                                                 // every other question: a calm loop with a random micro-action every few seconds
//   scene.celebrate()                                            // the top rank on the end screen: he jumps and cheers, confetti falls, the rank name shimmers (CSS) and the curve marker glows;
//                                                                // call it in end() after scene.reset() when the total is 640 or more; idle()/ready()/dig() clear it. Static with reduced motion.
//   scene.urgent(true | false)                                   // the last 5 seconds: a soft red pulse at the screen edges, once per second (static red edge with reduced motion)
//   scene.dig(key, label, benchLabel)                            // after an answer (v7, longer): common about 3.5 s, uncommon 4.5 s, none 3 s, rare 6 s, veryRare 8 s (strokes with dust and clinks, a pause where he looks, a brush-off of the find;
//                                                                // rare and very rare add a camera push-in on the pit in whole zoom steps, a tighter vignette, a rising rumble, a heartbeat, a held breath, then the reveal and a pull-back);
//                                                                // benchLabel = the word under the find on the bench (default BENCH_LABELS[key]: Common, Uncommon, Rare, Very rare, Nothing)
//   scene.reset()                                                // = idle() (does NOT clear the finds)
//   scene.newDay()                                               // clear the finds bench: call it when a new game starts (question 1)
//   scene.finds / scene.setFinds([...])                          // the day's finds so far / restore them; dig() adds a find, it flies to the bench after the beat
//   scene.sound.play(name) / scene.sound.toggle() / scene.sound.muted     (see sound.js; the scene plays dig, reveal, rumble and next sounds itself)
//
// Any key press or tap during a dig beat jumps to its end state at once; Next and the input are never blocked. Under prefers-reduced-motion nothing moves:
// the end pose shows, the vignette never appears, and the reaction label still shows, at rest. The artwork is decorative (aria-hidden); the sentence in
// p.dig is its text alternative, the squares have the words in .sr, the sound button has an aria-label.

import { createSound } from "./sound.js";
import { ERAS, eraIndex, eraAt, SQ, squareAt, holeOf, actorOffset, actorToStage, drawSite, drawSquares, itemCanvas, tagCanvas, SITE, FIELD, SLOT_X, TABLE_Y, ITEM_NAMES } from "./field.js";
export { ERAS, eraAt };

export const DIG = {
  common:   { tool: "brush",   find: "shard" },
  uncommon: { tool: "pickaxe", find: "coin" },
  rare:     { tool: "digger",  find: "crown" },
  veryRare: { tool: "truck",   find: "statue" },
  none:     { tool: "spoon",   find: "rock" },
};

// Default floating reactions (English). Put your own in js/strings/en.js and pass them to scene.dig(key, label).
export const REACTIONS = { none: "Nothing", common: "Common", uncommon: "Nice!", rare: "Rare find!", veryRare: "One in a million!" };

// rows of man.png (8 columns of 144 x 112): name -> [row, frames]
const MAN = {
  idle: [0, 4], wipe: [1, 8], notebook: [2, 8], glance: [3, 6], scratch: [4, 8], flask: [5, 8], ready: [6, 6],
  brush: [7, 8], pickaxe: [8, 8], spoon: [9, 8], watch_digger: [10, 8], watch_truck: [11, 8], lean_crown: [12, 8], lift_statue: [13, 8],
  rx_none: [14, 8], rx_common: [15, 8], rx_uncommon: [16, 8], rx_rare: [17, 8], rx_veryRare: [18, 8], brushoff: [19, 8], peer: [20, 8], crank: [21, 8],
};
const MICRO = { wipe: 1.2, notebook: 1.6, glance: 1.2, scratch: 1.2, flask: 1.6 };       // idle micro-actions and how long each plays
const WINCH = { cycle: [0, 8], lift: [1, 6], rest: [2, 1] };                // rows of winch.png (176 x 104): the bucket cycle, the lift, the rig at rest
const MACHINE = { digger_drive: [0, 4], digger_dig: [1, 8], truck_drive: [2, 4], truck_tip: [3, 8], truck_leave: [4, 4] };   // rows of machine.png (144 x 80)
const SPARKLE = new Set(["rare", "veryRare"]);
// where he stands inside his sheet row [x from the frame's left edge, feet y]: rows drawn at another spot make him walk there. v7: every dig row is drawn at the trench lip ([76, 80]),
// so every stroke (brush, pickaxe, spoon) lands inside the trench (stage x 90 to 150, y 22 to 80)
const PIT = [76, 80];
const ANCHOR = { watch_digger: [32, 88], watch_truck: [32, 88], brush: PIT, pickaxe: PIT, spoon: PIT, peer: PIT, crank: PIT, brushoff: PIT, lean_crown: PIT, lift_statue: PIT, rx_none: PIT, rx_common: PIT, rx_uncommon: PIT, rx_rare: PIT, rx_veryRare: PIT };
const FX = { puff: [0, 6], soil: [1, 6], clink: [2, 4] };            // rows of fx.png (40 x 28)
// the word under each find on the bench: at most 6 letters a line and two lines ("\n"), so 7 places fit a 375 px phone on one straight row
export const BENCH_LABELS = { common: "Common", uncommon: "Un-\ncommon", rare: "Rare", veryRare: "Very\nrare", none: "No\nfind" };

const asset = (name) => new URL(`./scene/${name}`, import.meta.url).href;
const sprite = (kind, name) => new URL(`./sprites/${kind}/${name}.png`, import.meta.url).href;

function el(tag, className, props = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.assign(node, props);
  return node;
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

export function mountScene(parent = document.body, opts = {}) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = { get matches() { return opts.still || mq.matches; } };      // opts.still = true: final frames at once (screenshots, tests)
  const sound = createSound();

  // ---- DOM: layers back to front, then the stage where the action happens ----
  const root = el("div", "", { id: "scene" });
  root.setAttribute("aria-hidden", "true");
  const world = el("div", "world");
  const layer = (cls, src) => el("img", `layer ${cls}`, { src: asset(src), alt: "", decoding: "async" });
  const stage = el("div", "stage");
  const machine = el("div", "sprite machine");
  const machineWrap = el("div", "machine-wrap");          // wrappers carry the movement (rolling in, being lifted), so it never restarts the sprite animation inside
  machineWrap.append(machine);
  const man = el("div", "sprite man");
  const manWrap = el("div", "man-wrap");                    // carries the walking between his spots, so a changed anchor never makes him jump
  manWrap.append(man);
  const find = el("div", "sprite find");
  const sparkle = el("div", "sprite sparkle");
  const findWrap = el("div", "find-wrap");
  const findTag = el("div", "find-tag");                       // the name tag next to a held-up find
  findTag.hidden = true;
  findWrap.append(find, sparkle, findTag);
  const winch = el("div", "sprite winch");                    // the hand winch (very rare): hauls earth out of the trench, then lifts the find
  winch.hidden = true;
  const react = el("div", "react");
  const site = el("canvas", "site");                         // v14: the excavation field (field.js), drawn once
  drawSite(site);
  site.style.left = `${SITE.x0}px`;
  site.style.top = `${SITE.y0}px`;
  const trench = el("canvas", "trench");                     // v15: the 7 squares, redrawn as one is dug
  trench.style.left = `${SITE.x0}px`;
  trench.style.top = `${SITE.y0}px`;
  const actors = el("div", "actors");                        // v15: he, the machines, the find and the dust stand at the square he digs: this moves them there
  const eraTags = el("div", "era-tags");                     // the name of the layer at the bottom of his square
  const item = el("div", "efind");                           // the find of this answer (a thing from the layer he is in)
  const rope = el("div", "rope");                            // the winch rope while it hoists the find
  rope.hidden = true;
  findWrap.prepend(item);
  const slots = el("div", "slots");                          // the finds bench: the day's finds stand here, in the order found
  const slotLabels = el("div", "slots");                     // the labels sit above all the finds (a find in front never hides a label)
  const fxPool = [0, 1, 2].map(() => { const n = el("div", "sprite fx"); n.hidden = true; return n; });   // dust, flying soil and sparks (3 can play at once)
  actors.append(winch, rope, machineWrap, manWrap, ...fxPool, findWrap, react);
  stage.append(site, trench, slots, slotLabels, eraTags, actors);
  // ambient life: three groups of grass over the whole meadow that sway out of step, tree tops that lean (mid2 is the second frame), a tarp that flutters,
  // lanterns that flicker, two birds, drifting clouds. All of it stops under prefers-reduced-motion.
  world.append(layer("sky", "sky.png"), layer("twinkle", "twinkle.png"), el("div", "layer clouds"), layer("far", "far.png"), layer("ground", "ground.png"),
    el("div", "layer grass-all ga"), el("div", "layer grass-all gb"), el("div", "layer grass-all gc"), layer("mid", "mid.png"), layer("mid mid2", "mid2.png"),
    el("div", "bird"), el("div", "bird b2"), stage);
  const vignette = el("div", "vignette");
  const urgentEdge = el("div", "urgent-edge");               // the red edges of the last 5 seconds (see scene.urgent)
  const flash = el("div", "eflash");                         // v14: a new layer (a small flash), rare and very rare (a full one)
  root.append(world, vignette, flash, urgentEdge);
  const hudEl = el("div", "", { id: "hud" });
  parent.prepend(root, hudEl);

  // ---- sprite sheets played with CSS steps(): one row per animation, frames side by side ----
  let anchor = [52, 88];
  const ROW_NAME = Object.fromEntries(Object.entries(MAN).map(([k, [r]]) => [r, k]));
  function walkTo(name) {                                      // he stands at another x in this row: slide there in steps instead of jumping
    const target = ANCHOR[name] ?? [52, 88];
    if ((target[0] !== anchor[0] || target[1] !== anchor[1]) && !reduce.matches) {
      manWrap.style.setProperty("--shift", `${anchor[0] - target[0]}px`);
      manWrap.style.setProperty("--shifty", `${anchor[1] - target[1]}px`);
      manWrap.classList.remove("walk");
      void manWrap.offsetWidth;
      delay(manWrap);
      manWrap.classList.add("walk");
    }
    anchor = target;
  }
  function play(node, [row, frames], seconds, mode) {          // mode: "once" (hold the last frame) | "loop"
    if (node === man) walkTo(ROW_NAME[row]);
    node.style.setProperty("--row", row);
    node.style.setProperty("--n", frames);
    node.style.setProperty("--n1", frames - 1);
    node.style.setProperty("--dur", `${seconds / speed}s`);
    node.style.setProperty("--last", mode === "loop" ? 0 : frames - 1);
    node.classList.remove("once", "loop", "still");
    void node.offsetWidth;                                    // restart the CSS animation
    delay(node);
    node.classList.add(reduce.matches ? "still" : mode);
  }
  const hold = (node) => { node.classList.remove("once", "loop"); node.classList.add("still"); };
  const slide = (from, seconds) => {                           // the machine rolls in from the left
    machineWrap.style.setProperty("--from", `${from}px`);
    machineWrap.style.setProperty("--slide", `${seconds / speed}s`);
    machineWrap.classList.remove("slide-in");
    void machineWrap.offsetWidth;
    delay(machineWrap);
    machineWrap.classList.add("slide-in");
  };

  const leave = (row, seconds) => {                           // the machine drives away to the left (the work is done)
    machineWrap.style.setProperty("--to", "-120px");
    machineWrap.style.setProperty("--slide", `${seconds / speed}s`);
    machineWrap.classList.remove("slide-in", "slide-out");
    void machineWrap.offsetWidth;
    delay(machineWrap);
    machineWrap.classList.add("slide-out");
    play(machine, row, seconds, "loop");
    later(() => { machine.hidden = true; }, seconds + 0.05);
  };

  let timers = [];
  const DIG_SPEED = 1.25;                                      // the dig beats run this much faster than the times written below
  let speed = 1;                                               // DIG_SPEED while a dig beat plays, 1 in idle and in the quiet start
  let cam = null;                                             // the camera push-in { step, left, right }: whole zoom steps added to the zoom (null = normal view); see camPlace() and paint()
  let hushed = false;
  let settleFn = null;
  let phaseWas = false;
  let clock = 0;                                              // seconds already elapsed in the beat (only used when opts.seek is set: screenshots, tests)
  const delay = (node) => { node.style.animationDelay = clock ? `-${clock}s` : ""; };
  const later = (fn, seconds) => {
    seconds /= speed;
    if (opts.seek != null) {                                  // seek mode: run what is due by now, started late by the right amount, and skip the rest
      if (seconds <= opts.seek) { clock = opts.seek - seconds; fn(); clock = 0; }
      return;
    }
    timers.push(setTimeout(fn, seconds * 1000));
  };
  const cancel = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (settleFn) { removeEventListener("keydown", settleFn, true); removeEventListener("pointerdown", settleFn, true); settleFn = null; }
    root.classList.remove("rumble", "dim", "dim-strong", "dim-tight", "beat");
    world.classList.remove("rumble");
    if (cam) { cam = null; paint(); }                                     // the camera is back at its normal view
    if (hushed) { hushed = false; sound.unhush(); }                       // the held breath is over
  };
  const hideActors = () => {
    machine.hidden = find.hidden = sparkle.hidden = react.hidden = winch.hidden = findTag.hidden = item.hidden = rope.hidden = true;
    findWrap.style.translate = "";
    winch.classList.remove("still", "once", "loop");
    findWrap.classList.remove("lift", "lifted", "held");
    fxPool.forEach((n) => { n.hidden = true; });
    machine.classList.remove("still", "once", "loop");
    machineWrap.classList.remove("slide-in", "slide-out");
    findWrap.classList.remove("carry", "carried");
    react.classList.remove("float", "slam", "still");
  };
  const phase = (on) => document.body.classList.toggle("phase-feedback", on);

  // ---- v15: the 7 squares of the day ----
  let k = 0.5;                                                 // the actors' scale (set by fit()): he is drawn at a smaller pixel size than the field
  let depth = 0;                                               // points today
  let squares = Array(7).fill(null);                           // { key, points, dug } per square
  let cur = 0;                                                 // the square he is at (the next to dig, or the one he digs)
  let shown = 0;                                               // the depth (points) drawn in his square right now (it runs up while he digs)
  let flashes = 0;                                             // flashes this answer (at most 3)
  const overview = () => hudEl.hidden || document.body.classList.contains("phase-end");   // intro / end screen: the whole field
  const deepestSquare = () => { let best = -1; squares.forEach((q, i) => { if (q?.dug && (best < 0 || q.points > squares[best].points)) best = i; }); return best; };
  // a stage point -> the actor point that lands there (the actors are moved to his square and scaled by k about his feet, actor point 78, 84)
  const stageToActor = (x, y) => { const [ax, ay] = actorOffset(cur); return [78 + (x - ax - 78) / k, 84 + (y - ay - 84) / k]; };
  function paintField(breaking = false) {
    const list = squares.map((q, i) => (i === cur && q ? { ...q, points: shown } : q));
    drawSquares(trench, list, { deepest: overview() ? deepestSquare() : -1, breaking: breaking ? cur : -1 });
    const [ax, ay] = actorOffset(cur);
    actors.style.translate = `${ax}px ${ay}px`;                 // he walks to his square (CSS steps); scaled by k about his feet, see fit()
    eraTags.replaceChildren();
    const whole = overview(), deep = whole ? deepestSquare() : -1;
    list.forEach((q, i) => {                                     // the name of the bottom layer under the square: only his square during a question, every square at the end
      if (!q?.dug || (!whole && i !== cur)) return;
      const name = q.key === "none" ? "No find" : eraAt(q.points).short;
      const n = el("p", whole ? (i === deep || eraIndex(q.points) === ERAS.length - 1 ? "all gold" : "all") : "here", { textContent: name });
      n.style.left = `${whole ? (squareAt(i).x0 + squareAt(i).x1) / 2 : squareAt(i).x1 + 1}px`;
      n.style.top = `${squareAt(i).front + (whole ? -1 : 3)}px`;
      eraTags.append(n);
    });
  }
  // his square goes down from `shown` to `to` points between t0 and t1 seconds (in steps); a new layer gets a puff of dust, a small flash and the layer sound
  function deepen(to, t0, t1) {
    const from = shown, steps = Math.max(1, Math.round((t1 - t0) / 0.12));
    for (let q = 1; q <= steps; q++) later(() => {
      const was = eraIndex(shown);
      shown = Math.round(from + ((to - from) * q) / steps);
      paintField();
      if (eraIndex(shown) !== was) newLayer();
    }, t0 + ((t1 - t0) * q) / steps);
  }
  function newLayer() {
    sound.play("layer");
    const hq = holeOf(cur, shown, squares[cur]?.key === "none");
    fx("puff", ...stageToActor((hq.x0 + hq.x1) / 2, hq.back + hq.h), 0.5);
    if (flashes < 2) flashOnce(0.45);                            // the third flash is kept for the reveal
    const tag = eraTags.lastElementChild;
    if (tag) { tag.classList.remove("new"); void tag.offsetWidth; tag.classList.add("new"); }
  }
  function flashOnce(a, white = false) {                       // one flash: at most 3 an answer, never 3 a second
    if (reduce.matches || opts.seek != null || flashes >= 3) return;
    flashes++;
    flash.classList.toggle("white", white);
    [a, a * 0.6, a * 0.3, 0].forEach((v, q) => setTimeout(() => (flash.style.opacity = v), q * (white ? 130 : 80)));
  }
  function goNext() { cur = Math.min(finds.length, 6); shown = squares[cur]?.points ?? 0; paintField(); fit(); }   // a new question: he walks to the next square

  // ---- the day's finds, kept on the bench: ONE straight row of 7 places, evenly spread, the order found from left to right, the rarity word under each ----
  // ---- v14: the day's finds stand on the find table behind the trench, in the order found, each with a white tag with its number ----
  const labels = { ...BENCH_LABELS, ...(opts.benchLabels ?? {}) };
  let finds = [];                                              // [{ key, points, depth, era, find }]
  let pending = null;                                          // a find that is still in the trench or in his hands, waiting to go to the table
  let pendingLabel = null;
  function placeFind(f, animate, label, from = [120, 50]) {      // put a find on the next free place (at most 7); animate = it flies over from where it was shown
    if (finds.length >= 7) return;
    const i = finds.length;
    finds.push(f);
    const slot = el("div", "slot eslot");
    slot.append(itemCanvas(f.key === "none" ? "none" : f.era));
    const foot = TABLE_Y + 3;                                   // one row on the table, side by side
    slot.style.left = `${SLOT_X[i] - 6}px`;
    slot.style.top = `${foot - 12}px`;
    slot.dataset.n = String(i + 1);
    slot.dataset.key = f.key;
    if (animate && !reduce.matches) {
      slot.style.setProperty("--dx", `${from[0] - SLOT_X[i]}px`);
      slot.style.setProperty("--dy", `${from[1] - (foot - 6)}px`);
      delay(slot);
      slot.classList.add("fly");
    }
    const tag = el("div", "etag");                             // the white tag on the edge of the table; the rarity word is its text alternative (scene is aria-hidden anyway)
    tag.append(tagCanvas(i + 1, f.key === "rare" || f.key === "veryRare"));
    tag.style.left = `${SLOT_X[i] - 2}px`;                     // the small white number tag in front of the find
    tag.style.top = `${foot + 1}px`;
    tag.dataset.key = f.key;
    tag.title = String(label ?? labels[f.key]).replace("\n", "");
    slots.append(slot);
    slotLabels.append(tag);
  }
  let pendingFrom = [120, 50];                                 // where the pending find is (in the trench, beside him, or hanging from the winch)
  function putPending(animate) {
    if (!pending) return;
    const name = pending;
    const label = pendingLabel;
    pending = null;
    pendingLabel = null;
    find.hidden = true;
    sparkle.hidden = true;
    findWrap.classList.remove("carry", "carried", "lift", "lifted", "held", "glint");
    item.hidden = true;
    rope.hidden = true;
    findTag.hidden = true;
    placeFind(name, animate, label, actorToStage(cur, k, ...pendingFrom));   // the find was shown at his square (actor space); the table is behind the squares
    pendingFrom = [120, 50];
  }
  const flush = () => putPending(false);                       // a new beat or question starts: the find is on the bench at once

  // ---- the last 5 seconds: a soft red pulse at the screen edges, once per second (never faster than 1 Hz); a static red edge with reduced motion ----
  function urgent(on) {
    document.body.classList.toggle("urgent", !!on);
    urgentEdge.classList.toggle("on", !!on);
  }

  // ---- effects: dust, flying soil and sparks, played from fx.png at a point of the stage ----
  function fx(kind, x, y, seconds = 0.4) {
    if (reduce.matches) return;
    const node = fxPool.find((n) => n.hidden) ?? fxPool[0];
    node.hidden = false;
    node.style.left = `${x - 20}px`;
    node.style.top = `${y - 14}px`;
    play(node, FX[kind], seconds, "once");
    if (opts.seek == null) later(() => { node.hidden = true; }, seconds + 0.25);
  }
  const DUST_AT = { brush: [124, 73], pickaxe: [121, 74], spoon: [128, 72] };    // where each tool works (v7: INSIDE the trench), in stage coordinates

  // ---- the top rank: a moment of its own (confetti, the man cheers; the shimmering rank name and the glowing curve marker are CSS on body.celebrate) ----
  const confetti = el("div", "confetti");
  confetti.hidden = true;
  confetti.setAttribute("aria-hidden", "true");
  for (let n = 0; n < 26; n++) {
    const bit = el("i");
    bit.style.setProperty("--x", `${(n * 37 + 11) % 100}%`);
    bit.style.setProperty("--y", `${(n * 53 + 7) % 90}%`);
    bit.style.setProperty("--d", `${3.2 + (n % 5) * 0.5}s`);
    bit.style.setProperty("--w", `${-(n % 9) * 0.35}s`);
    bit.style.setProperty("--c", ["#ffd038", "#ec6e5a", "#bace78", "#ffee96", "#faf6eb", "#c27ad0"][n % 6]);
    confetti.append(bit);
  }
  parent.append(confetti);
  function celebrate(on = true) {
    document.body.classList.toggle("celebrate", !!on);
    confetti.hidden = !on;
    if (!on) return;
    sound.play("reveal-veryRare");
    play(man, MAN.rx_veryRare, 1.0, reduce.matches ? "once" : "loop");
  }

  // ---- idle: a calm loop, with a random micro-action (never a dig) every few seconds ----
  let lastMicro = "";
  function scheduleMicro() {
    if (reduce.matches || opts.seek != null) return;                 // (seek mode is for screenshots: no random micro-actions, they would recurse)
    later(() => {
      const names = Object.keys(MICRO).filter((n) => n !== lastMicro);
      const pick = names[Math.floor(Math.random() * names.length)];
      lastMicro = pick;
      play(man, MAN[pick], MICRO[pick], "once");
      later(() => { play(man, MAN.idle, 2.4, "loop"); scheduleMicro(); }, MICRO[pick]);
    }, 4 + Math.random() * 5);
  }
  function idle() {
    speed = 1;
    const wasFeedback = phaseWas;
    urgent(false);
    celebrate(false);
    flush();
    cancel();
    hideActors();
    phase(false);
    phaseWas = false;
    if (wasFeedback && !document.body.classList.contains("no-hud")) sound.play("next");   // not on the end screen, where "finish" plays
    goNext();
    play(man, MAN.idle, 2.4, "loop");
    scheduleMicro();
  }

  // a quiet start beat for the first question: he looks around and settles his hat (not a dig)
  function ready() {
    speed = 1;
    urgent(false);
    celebrate(false);
    flush();
    cancel();
    hideActors();
    phase(false);
    phaseWas = false;
    goNext();
    if (reduce.matches) return play(man, MAN.idle, 2.4, "loop");
    play(man, MAN.ready, 1.2, "once");
    later(() => { play(man, MAN.idle, 2.4, "loop"); scheduleMicro(); }, 1.2);
    settleFn = () => { cancel(); play(man, MAN.idle, 2.4, "loop"); scheduleMicro(); };
    addEventListener("keydown", settleFn, { capture: true, once: true });
    addEventListener("pointerdown", settleFn, { capture: true, once: true });
  }

  // ---- after an answer ----
  // Every beat is a list of [seconds, action]; settle() runs the end state directly. Good answers get a build-up: rare about 1.9 s, very rare about 2.5 s.
  let resolveDig = null;
  function dig(key, a, b, c) {
    // v14: dig(key, points, { label, benchLabel, findName }); the old dig(key, label, benchLabel, findName) still works (0 points)
    const pts0 = typeof a === "number" ? Math.max(0, a) : 0;
    const o = typeof a === "number" ? (b ?? {}) : { label: a, benchLabel: b, findName: c };
    const label = o.label, benchLabel = o.benchLabel;
    if (resolveDig) { resolveDig(); resolveDig = null; }
    speed = DIG_SPEED;
    urgent(false);
    celebrate(false);
    flush();
    cancel();
    hideActors();
    phase(true);
    phaseWas = true;
    const k = DIG[key] ? key : "none";
    const d = DIG[k];
    cur = Math.min(finds.length, 6);                            // v15: his square (one per answer)
    const pts = k === "none" ? 0 : Math.min(100, pts0);
    squares[cur] = { key: k, points: pts, dug: true };
    shown = 0;
    flashes = 0;
    depth += pts;
    const era = eraIndex(pts);                                   // the find comes out of the bottom layer of his square
    pending = { key: k, points: pts, era, find: d.find, square: cur };   // goes to the table at the end of the beat
    const findName = o.findName ?? (k === "none" ? "Plain rock" : opts.eraFindNames?.[era] ?? ITEM_NAMES[era]);
    item.replaceChildren(itemCanvas(k === "none" ? "none" : era));
    paintField();
    fit();                                                       // the camera goes to his square first
    pendingLabel = benchLabel ?? null;
    const text = label ?? REACTIONS[k];
    const big = k === "rare" || k === "veryRare";
    const showLabel = () => {
      react.textContent = text;
      react.dataset.key = k;
      react.hidden = false;
      react.classList.remove("float", "slam", "still");
      void react.offsetWidth;
      delay(react);
      react.classList.add(reduce.matches ? "still" : big ? "slam" : "float");
    };
    // v14: the find lies half buried in the floor of the trench; he lifts it out (to beside him) or the winch hoists it up on its rope
    const at = (x, y) => { findWrap.style.translate = `${Math.round(x - 120)}px ${Math.round(y - 50)}px`; pendingFrom = [x, y]; };
    const hq = holeOf(cur, pts, k === "none"), [fx0, fy0] = stageToActor((hq.x0 + hq.x1) / 2, hq.back + hq.h + 2);   // the find: half out of the bottom of his square
    const revealFind = () => { item.hidden = false; item.classList.add("buried"); at(fx0, fy0); };
    const moveFind = (to, seconds, t0 = 0, withRope = false) => {   // in steps, on the beat's clock
      const n = 6;
      later(() => { item.classList.remove("buried"); rope.hidden = !withRope; }, t0);
      for (let q = 1; q <= n; q++) later(() => {
        const x = fx0 + (to[0] - fx0) * (q / n), y = fy0 + (to[1] - fy0) * (q / n);
        at(x, y);
        if (withRope) { rope.style.top = "36px"; rope.style.height = `${Math.max(0, y - 6 - 36)}px`; }
      }, t0 + (seconds * q) / n);
    };
    const carryFind = (t0 = 0) => moveFind([96, 26], 0.3, t0);                   // he lifts it out and holds it up beside him
    const liftFind = (t0 = 0) => moveFind([120, 44], 0.6, t0, true);             // the winch hoists it out of the trench, on its rope
    const showTag = () => { findTag.textContent = findName; findTag.hidden = false; };   // the name tag next to the find while it is held up
    const sparkles = () => { sparkle.hidden = false; play(sparkle, [0, 6], 0.5, "once"); };
    const vignetteOn = (strong) => root.classList.add("dim", ...(strong ? ["dim-strong"] : []));
    const vignetteOff = () => root.classList.remove("dim", "dim-strong");
    const rumble = (on) => world.classList.toggle("rumble", on);

    // the end state of every beat (also what reduced motion shows, and what a key press or tap jumps to)
    const finalState = () => {
      cancel();
      shown = pts;
      paintField();
      flash.style.opacity = 0;
      vignetteOff();
      rumble(false);
      fxPool.forEach((n) => { n.hidden = true; });
      machine.hidden = true;                                   // the end state: the machine (or the winch) is gone
      winch.hidden = true;
      machineWrap.classList.remove("slide-in", "slide-out");
      putPending(false);                                       // the end state: the find stands on the bench
      play(man, MAN[`rx_${k}`], 0.5, "once");
      hold(man);
      manWrap.classList.remove("walk");                        // skipped: he is already where he ends
      sparkle.hidden = true;
      showLabel();
      react.classList.remove("float", "slam");
      react.classList.add("still");
      done();
    };
    const done = () => { if (resolveDig) { const r = resolveDig; resolveDig = null; r({ points: pts, era: ERAS[era].name, find: findName, square: cur }); } };

    const promise = new Promise((r) => { resolveDig = r; });
    if (reduce.matches) { finalState(); return promise; }
    if (opts.seek != null) { root.classList.add("seek-freeze"); clock = opts.seek; }   // seek mode: freeze the scene at that moment of the beat
    else {
      settleFn = () => finalState();                            // a key press, Enter or a tap: end state at once
      addEventListener("keydown", settleFn, { capture: true, once: true });
      addEventListener("pointerdown", settleFn, { capture: true, once: true });
    }

    // ---- the beats (v7: longer, more physical) ----
    // `hit` = what happens at each stroke; every row of man.png used here loops one cycle, so the strokes stay in step with the dust, the clinks and the sounds.
    const TOOL = {
      brush:   { cycle: 0.65, n: 3, hit: (i, t) => { later(() => sound.play("dig-brush"), t); later(() => fx("puff", DUST_AT.brush[0], DUST_AT.brush[1], 0.45), t + 0.16); later(() => fx("puff", DUST_AT.brush[0] + 3, DUST_AT.brush[1] - 1, 0.45), t + 0.48); } },
      pickaxe: { cycle: 0.75, n: 4, hit: (i, t) => { later(() => { sound.play("hit", i); fx("clink", DUST_AT.pickaxe[0], DUST_AT.pickaxe[1] - 4, 0.3); fx("soil", DUST_AT.pickaxe[0] + 2, DUST_AT.pickaxe[1], 0.45); }, t + 0.34); later(() => fx("puff", DUST_AT.pickaxe[0] - 2, DUST_AT.pickaxe[1], 0.5), t + 0.5); } },
      spoon:   { cycle: 0.55, n: 3, hit: (i, t) => { later(() => { sound.play("scrape", i); fx("soil", DUST_AT.spoon[0], DUST_AT.spoon[1], 0.4); }, t + 0.2); later(() => fx("puff", DUST_AT.spoon[0] + 2, DUST_AT.spoon[1], 0.4), t + 0.35); } },
    };
    const strokes = (tool, t0 = 0, n = TOOL[tool].n) => {         // the tool works n cycles from t0; returns when it is done
      const T = TOOL[tool];
      later(() => play(man, MAN[tool], T.cycle, "loop"), t0);
      for (let i = 0; i < n; i++) T.hit(i, t0 + i * T.cycle);
      return t0 + n * T.cycle;
    };
    // push(step, t, left, right): at t seconds the camera is `step` whole zoom steps closer, keeping stage x left..right on screen (the man from `left`, the pit to `right`); step 0 = back to normal
    const push = (step, t, left = 16, right = 148) => later(() => { cam = step ? { step, left, right } : null; paint(); if (step) { sound.play("thud"); root.classList.add("dim", "dim-tight"); } }, t);   // the closing vignette starts together with the zoom (our change)
    const beats = (from, to, t0, gap) => { let n = 0; for (let t = t0; t < to; t += gap, n++) { const i = n; later(() => { sound.play("heartbeat", i); if (opts.seek == null) { root.classList.add("beat"); setTimeout(() => root.classList.remove("beat"), 120); } }, t); gap = Math.max(gap * 0.93, 0.5); } };
    const breath = (t, seconds) => later(() => { hushed = true; sound.hush(seconds / speed); vignetteOff(); root.classList.add("dim", "dim-tight"); }, t);

    // v8: every good find is shown for a moment: it is lifted out, held up beside him (or hanging from the winch) with a small name tag, then it goes to the bench.
    const RANK = { common: 0, uncommon: 1, rare: 2, veryRare: 3, none: 4 };    // for the pitch and the glitter of the lift sound
    const SHOW = 1.1;                                           // seconds a find is held up
    if (k === "rare") {                                         // about 6.5 s (5.2 s at DIG_SPEED): he strikes something hard, the hand winch hauls earth OUT of the trench, the crown is hoisted out
      vignetteOn(false);
      sound.play("swell-rare");
      strokes("pickaxe", 0.2, 1);                               // one strike: it rings on something hard
      deepen(pts, 0.5, 3.2);                                  // the floor goes down while the buckets come up
      push(1, 1.1, 48, 148);                                    // one zoom step closer (and the vignette closes with it)
      later(() => { winch.hidden = false; play(winch, WINCH.rest, 1, "once"); hold(winch); fx("puff", 90, 80, 0.5); fx("puff", 152, 78, 0.5); sound.play("thud"); }, 1.0);   // the rig stands up beside the trench
      later(() => { play(man, MAN.crank, 0.8, "loop"); rumble(true); }, 1.1);
      const W = 1.0;                                            // one bucket per second: down, filled, up, tipped over the back of the trench, back
      for (let i = 0; i < 2; i++) {
        const t = 1.3 + i * W;
        if (i === 0) later(() => play(winch, WINCH.cycle, W, "loop"), t);
        later(() => sound.play("dig-digger"), t);
        later(() => { fx("soil", 119, 62, 0.45); fx("puff", 124, 66, 0.5); }, t + 0.15);              // earth leaves the trench: from the pit floor ...
        later(() => { fx("soil", 119, 20, 0.45); fx("puff", 126, 22, 0.5); }, t + 0.62);                // ... and tips behind it, onto the spoil heaps
        if (i % 2) later(() => { fx("clink", 112, 60, 0.3); sound.play("clink"); }, t + 0.3);
      }
      beats(0, 4.0, 2.0, 0.9);
      later(() => { rumble(false); play(winch, WINCH.rest, 1, "once"); hold(winch); }, 3.3);
      breath(3.35, 1.1);                                        // everything goes quiet, the vignette closes round the pit
      later(() => play(man, MAN.peer, 0.9, "once"), 3.4);       // he steps up to the trench and looks in
      later(() => { revealFind(); sound.play("reveal-rare"); root.classList.remove("dim-tight"); fx("puff", fx0, fy0, 0.5); }, 4.3);
      later(() => { play(winch, WINCH.lift, 0.6, "once"); play(man, MAN.crank, 0.6, "once"); sound.play("lift", RANK.rare); }, 4.7);   // the hook takes the find and hoists it out
      liftFind(4.7);
      later(() => flashOnce(0.6), 5.4);                         // a flash as it comes up
      push(0, 5.0);                                             // the camera pulls back as it rises
      later(() => { play(man, MAN.rx_rare, 0.5, "once"); sparkles(); showLabel(); showTag(); vignetteOff(); }, 5.4);
      later(done, 5.4);
      later(() => putPending(true), 5.4 + SHOW);
    } else if (k === "veryRare") {                              // about 8.3 s (6.6 s at DIG_SPEED): he strikes something hard, the DIGGER rolls in and scoops, then the winch hoists the statue out
      vignetteOn(true);
      sound.play("swell-veryRare");
      strokes("pickaxe", 0.2, 2);                               // two strikes: the second one rings on something hard
      later(() => { machine.hidden = false; slide(-90, 0.35); play(machine, MACHINE.digger_drive, 0.4, "loop"); play(man, MAN.watch_digger, 0.8, "loop"); sound.play("rumble"); }, 1.6);   // the digger rolls in, he waves it on
      const CYC = 0.7;
      later(() => { play(machine, MACHINE.digger_dig, CYC, "loop"); rumble(true); }, 2.0);
      deepen(pts, 2.0, 4.1);                                  // the digger takes the trench down
      for (let i = 0; i < 3; i++) {
        const t = 2.0 + i * CYC;
        later(() => sound.play("dig-digger"), t);
        later(() => { fx("puff", 112, 56, 0.5); fx("soil", 104, 60, 0.45); }, t + 0.3);
        later(() => { fx("soil", 120, 58, 0.45); if (i % 2) { fx("clink", 100, 54, 0.3); sound.play("clink"); } }, t + 0.5);
      }
      push(1, 2.1, 16, 148);                                    // the first zoom step while the digger works (he stands at the far left, x 18)
      beats(0, 6.4, 2.4, 0.9);
      later(() => { rumble(false); leave(MACHINE.digger_drive, 0.35); fx("puff", 108, 62, 0.5); }, 4.15);   // the digger drives away
      later(() => { winch.hidden = false; play(winch, WINCH.rest, 1, "once"); hold(winch); fx("puff", 90, 80, 0.5); fx("puff", 152, 78, 0.5); sound.play("thud"); }, 4.4);   // the rig stands up beside the trench
      push(2, 4.5, 62, 148);                                    // a second zoom step (from here he works at the trench, x 63 and up; the last rim pixels may clip on a narrow phone)
      breath(4.6, 1.4);
      later(() => play(man, MAN.peer, 0.9, "once"), 4.65);      // he steps up to the trench and looks in
      later(() => vignetteOn(true), 5.5);
      later(() => { revealFind(); findWrap.classList.add("glint"); sound.play("reveal-veryRare"); root.classList.remove("dim-tight"); fx("puff", fx0, fy0, 0.5); }, 5.8);
      later(() => { play(winch, WINCH.lift, 1.5, "once"); play(man, MAN.crank, 1.5, "once"); sound.play("lift", RANK.veryRare); }, 6.3);   // the hook takes it and hoists it out ...
      liftFind(6.3);
      later(() => { speed = DIG_SPEED * 0.4; }, 6.31);          // ... in slow motion (the times after this run 2.5 x slower)
      later(() => { speed = DIG_SPEED; flashOnce(0.95, true); sound.play("finish"); }, 6.9);   // a white flash and the fanfare as it comes out, gold
      push(0, 7.0);                                             // the camera pulls back
      later(() => { play(man, MAN.rx_veryRare, 0.6, "once"); sparkles(); showLabel(); showTag(); vignetteOff(); done(); }, 7.1);
      later(() => putPending(true), 7.1 + SHOW + 0.6);
    } else {                                                    // common 4.5 s, uncommon 5.5 s, none 4 s: the tool works several times, he leans in and looks, brushes the find clean and holds it up
      const t = strokes(d.tool);
      deepen(pts, 0.2, t);                                    // the floor goes down with his strokes
      if (k === "uncommon") later(() => { rumble(true); later(() => rumble(false), 0.3); }, t - 0.4);   // a small shock on the last stroke
      const P = k === "none" ? 0.5 : 0.6;                       // the pause where he looks
      later(() => play(man, MAN.peer, P, "once"), t);
      const B = t + P;
      later(() => { play(man, MAN.brushoff, 0.7, "once"); fx("puff", 118, 70, 0.5); sound.play("brushoff"); }, B);
      later(() => { revealFind(); sound.play(`reveal-${k}`); }, B + 0.1);
      later(() => fx("puff", fx0, fy0, 0.5), B + 0.4);
      later(() => sound.play("lift", RANK[k]), B + 0.75);
      carryFind(B + 0.75);                                      // he lifts it out and holds it up beside him
      later(() => { play(man, MAN[`rx_${k}`], 0.5, "once"); showLabel(); showTag(); done(); }, B + 1.1);
      later(() => putPending(true), B + 0.95 + SHOW);
    }
    clock = 0;
    return promise;
  }

  // ---- the top bar: sound button, progress squares, score chip (and an optional chip), the timer ----
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
      urgent(false);
      hudEl.hidden = true;
      document.body.classList.add("no-hud");
      return fit();
    }
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
    } else {
      q.append(el("span", "txt", { textContent: info.counter ?? "" }));
    }
    row.append(left, q, el("p", "hud-score", { textContent: info.score ?? "" }));
    hudEl.replaceChildren(row, ...(info.timer ? [info.timer] : []));
    fit();
  }

  // ---- v7: how see-through the panels are. Reads --glass (main.js may override it, e.g. ?glass=clear) and sets html[data-glass] = "clear" | "light" | "": theme.css gives the text
  // a stronger dark halo and heavier type as the glass gets thinner, so it stays readable even with no panel background at all.
  function glassMode() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--glass").trim();
    const m = v.match(/rgba?\(([^)]+)\)/);
    const a = v === "transparent" || v === "" ? 0 : m ? (m[1].split(/[,/ ]+/).filter(Boolean)[3] ?? 1) : 1;
    document.documentElement.dataset.glass = a < 0.06 ? "clear" : a < 0.25 ? "light" : "";
  }

  // ---- the camera (v10): a push-in on the pit in WHOLE zoom steps (the pixels stay crisp). camPlace() picks the largest step (up to the asked one) that keeps stage x left..right and the
  // rows 20 to 102 (the man's head to his feet and the pit) inside the FREE AREA (between the question text and the bottom bar, see fit()), and shifts the stage so nothing leaves the
  // screen or goes under the question, the top bar or the bottom bar. Step 0 is exactly the layout fit() computed. ----
  let base = { s: 3, sy: 40, ox: 0 };
  let area = { top: 0, bottom: 600, vw: 375 };
  function camPlace({ step, left, right }) {
    // v14: he and the find (actor rows 20 to 100, moved down with the trench floor) and the window left..right (actor x)
    const [l0, t0] = actorToStage(cur, k, left, 20), [r0, b0] = actorToStage(cur, k, right, 100);
    left = l0; right = r0;
    const topRow = Math.round(t0) - 6, rows = Math.round(b0 - t0) + 12;
    for (let st = step; st > 0; st--) {
      const s = base.s + st;
      if ((right - left) * s > area.vw - 16 || rows * s > area.bottom - area.top) continue;          // this step would not fit: try a smaller one
      let ox = area.vw / 2 - ((left + right) / 2 - 92) * s;                                           // the window left..right in the middle of the screen ...
      ox = Math.min(Math.max(ox, 8 - (left - 92) * s), area.vw - 8 - (right - 92) * s);               // ... but never past either edge
      const y = Math.min(Math.max((area.top + area.bottom) / 2 - (rows / 2) * s, area.top), area.bottom - rows * s);   // the rows centred in the free area
      return { s, ox: Math.round(ox), sy: Math.round(y / s - topRow) };
    }
    return null;
  }
  function paint() {
    const p = cam && !reduce.matches ? camPlace(cam) : null;
    const { s, ox, sy } = p ?? base;
    root.style.setProperty("--s", s);
    root.style.setProperty("--sy", sy);
    root.style.setProperty("--ox", `${ox}px`);
    const [vx, vy] = actorToStage(cur, k, 106, 64);                      // the tight vignette is centred between him and the find
    root.style.setProperty("--pitx", `${ox + (vx - 92) * s}px`);
    root.style.setProperty("--pity", `${(sy + vy) * s}px`);
    root.style.setProperty("--vigr", `${28 * s}px`);
  }

  // ---- fit: a whole-number zoom so every art pixel is the same size. v10: while a question is on screen the stage sits in the FREE AREA between the question text (the bottom of main) and the
  // bottom bar (the input bar, the hint line or the Next button, all position: fixed); on the intro and end screens (body.no-hud) it sits below the centred panel as before ----
  function fit() {
    const vv = window.visualViewport;
    const vw = window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const root_ = document.documentElement;
    const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;     // on-screen keyboard (iOS keeps the layout viewport)
    root_.style.setProperty("--kb", `${kb}px`);                          // first: the bottom bar's position depends on it
    const compact = vh < 560;
    root_.classList.toggle("compact", compact);                         // keyboard open or a landscape phone: smaller type
    root_.classList.remove("side");
    const hudBottom = () => (hudEl.hidden ? 12 : Math.ceil(hudEl.getBoundingClientRect().bottom));
    let ptop = hudBottom() + 10;
    // v15: while a question is on screen the camera shows his square (and him, and the floating label above him); the intro and the end screen show the whole field
    const sq = squareAt(cur), whole = overview();
    const rowTop = whole ? FIELD.top : sq.back - 40, need = (whole ? FIELD.bottom : sq.front + 16) - rowTop;
    const cx = whole ? (SQ[0].x0 + SQ[3].x1) / 2 : sq.x0 + 12;
    const sMin = Math.ceil(Math.max(vw / 640, vh / 460, 2));            // the picture must cover the screen
    const sWide = Math.max(Math.floor(vw / (whole ? 180 : 92)), 2);     // v15: his square with him beside it is about 92 art px wide; the 7 squares 180
    const mainEl = document.querySelector("main");
    const phone = mainEl && !hudEl.hidden && !document.body.classList.contains("no-hud") && !document.body.classList.contains("phase-end");     // the question layout (not the intro, not the end screen)
    let top, bottom, s;
    if (phone) {
      top = Math.max(hudBottom() + 6, Math.ceil(mainEl.getBoundingClientRect().bottom) + 6);
      const bars = [...mainEl.querySelectorAll(":scope > form, :scope > button, :scope > .msg")].filter((n) => n.getClientRects().length).map((n) => n.getBoundingClientRect().top);
      bottom = (bars.length ? Math.min(...bars) : vh - 8) - 8;
      s = 2;
      for (let t = Math.min(4, sWide); t >= 2; t--) if (bottom - need * t >= top - 8 * t) { s = t; break; }     // the label rows (18 to 26) may slide under the question text, nothing else
      s = Math.max(s, Math.min(sMin, 4));                              // the picture must still cover the screen (tall phones)
    } else {
      const reserve = compact ? 170 : Math.min(vh * 0.5, 340);        // room kept for the centred panel
      top = ptop + reserve + 4;
      bottom = vh - 8;
      s = Math.max(2, Math.min(4, Math.floor((bottom - top) / need), sWide));
      s = Math.max(s, Math.min(sMin, 4));
    }
    const space = bottom - top;
    const topUsed = Math.min(Math.max(top + (space - need * s) / 2, top - 8 * s), bottom - need * s);   // centred in the free area; when it does not fit it rises under the question, never past the bar
    const sy = Math.round(topUsed / s - rowTop);                        // the first row we need
    base = { s, sy, ox: Math.round(vw / 2 - (cx - 92) * s) };           // his square (or the whole field) in the middle
    area = { top, bottom, vw };
    k = Math.max(1, Math.floor(s / 2)) / s;                             // the actors at half the pixel size of the field (whole screen px): he fits beside a square
    actors.style.scale = k;
    paint();
    const rs = root_.style;
    rs.setProperty("--cx", `${Math.round(vw / 2)}px`);
    rs.setProperty("--stagetop", `${Math.round(topUsed)}px`);                // where the stage begins: the intro / end panel stops here (see theme.css)
    glassMode();
    rs.setProperty("--vh", `${vh}px`);
    rs.setProperty("--ptop", `${ptop}px`);
  }
  // the layout depends on the height of the question text and on which bar is showing: refit when main changes (a new question, a hint, the feedback) or the body class changes
  const refit = () => requestAnimationFrame(() => fit());
  const mainNode = document.querySelector("main");
  if (mainNode) {
    new MutationObserver(refit).observe(mainNode, { childList: true, subtree: true, characterData: true });
    if (window.ResizeObserver) new ResizeObserver(refit).observe(mainNode);
  }
  new MutationObserver(refit).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", fit);
  window.visualViewport?.addEventListener("resize", fit);
  window.visualViewport?.addEventListener("scroll", fit);

  hudEl.hidden = true;
  idle();
  fit();
  // the day's finds: dig() adds one, newDay() clears them (call it when a new game starts), setFinds() restores a list (["shard", "coin", ...]), hud(null) leaves them
  const newDay = () => { finds = []; pending = null; slots.replaceChildren(); slotLabels.replaceChildren(); depth = 0; squares = Array(7).fill(null); cur = 0; shown = 0; paintField(); fit(); };
  // v15: setDay([{ key, points }]) restores a day: every square at its depth, each find on the table. setFinds([...find names]) still works (shallow squares).
  const setDay = (list = []) => {
    newDay();
    list.slice(0, 7).forEach(({ key, points }, i) => {
      const k = DIG[key] ? key : "none", pts = k === "none" ? 0 : Math.min(100, Math.max(0, points || 0));
      squares[i] = { key: k, points: pts, dug: true };
      depth += pts;
      placeFind({ key: k, points: pts, era: eraIndex(pts), find: DIG[k].find, square: i }, false);
    });
    cur = Math.min(finds.length, 6);
    shown = squares[cur]?.points ?? 0;
    paintField();
    fit();
  };
  const KEY_OF = Object.fromEntries(Object.entries(DIG).map(([k, v]) => [v.find, k]));
  const setFinds = (list) => setDay(list.map((n) => ({ key: KEY_OF[n] ?? "none", points: 0 })));
  paintField();
  return { hud, idle, ready, dig, reset: idle, fit, sound, newDay, setDay, setFinds, urgent, celebrate, get depth() { return depth; }, get finds() { return finds.map((f) => ({ ...f })); } };
}

// items: [{ find: "coin", label: "Gold coin" }, ...]  -> <ul class="museum">, one case per find (end screen, also the share image)
export function museum(items) {
  const list = el("ul", "museum");
  for (const { find, label, era, key } of items) {
    const li = el("li");
    if (era != null) { const c = itemCanvas(key === "none" ? "none" : era); c.className = "find-img"; li.append(c, document.createTextNode(label)); list.append(li); continue; }   // v14: the thing from its layer
    li.append(el("img", "find-img", { src: sprite("finds", find), alt: "", decoding: "async" }), document.createTextNode(label));
    list.append(li);
  }
  return list;
}
