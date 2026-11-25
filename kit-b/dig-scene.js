// Fullscreen dig scene for Historillion (2D kit, v3): a layered dusk scene, an animated archaeologist with a living idle, a build-up for rare finds,
// a top bar with progress squares and a sound button, floating reactions. Built with createElement (no innerHTML). Assets load relative to this file.
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
const FIND_NAMES = { shard: "Painted shard", coin: "Gold coin", crown: "Jewelled crown", statue: "Marble head", rock: "Plain rock" };   // the name tag of a held-up find (opts.findNames or dig()'s 4th argument change them)
const MACHINE = { digger_drive: [0, 4], digger_dig: [1, 8], truck_drive: [2, 4], truck_tip: [3, 8], truck_leave: [4, 4] };   // rows of machine.png (144 x 80)
const FIND_ROW = { shard: 0, coin: 1, crown: 2, statue: 3, rock: 4 };
const SPARKLE = new Set(["rare", "veryRare"]);
// where he stands inside his sheet row [x from the frame's left edge, feet y]: rows drawn at another spot make him walk there. v7: every dig row is drawn at the trench lip ([76, 80]),
// so every stroke (brush, pickaxe, spoon) lands inside the trench (stage x 90 to 150, y 22 to 80)
const PIT = [76, 80];
const ANCHOR = { watch_digger: [32, 88], watch_truck: [32, 88], brush: PIT, pickaxe: PIT, spoon: PIT, peer: PIT, crank: PIT, brushoff: PIT, lean_crown: PIT, lift_statue: PIT, rx_none: PIT, rx_common: PIT, rx_uncommon: PIT, rx_rare: PIT, rx_veryRare: PIT };
const FX = { puff: [0, 6], soil: [1, 6], clink: [2, 4] };            // rows of fx.png (40 x 28)
// the word under each find on the bench: at most 6 letters a line and two lines ("\n"), so 7 places fit a 375 px phone on one straight row
const BENCH_SHORT = { common: "Com", uncommon: "Unc", rare: "Rare", veryRare: "V.R.", none: "None" };   // only at zoom 2 (short phones): codes that fit 34 px
export const BENCH_LABELS = { common: "Common", uncommon: "Un-\ncommon", rare: "Rare", veryRare: "Very\nrare", none: "No\nfind" };
const FIND_KEY = { shard: "common", coin: "uncommon", crown: "rare", statue: "veryRare", rock: "none" };   // which rarity each find stands for

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
  const slots = el("div", "slots");                          // the finds bench: the day's finds stand here, in the order found
  const slotLabels = el("div", "slots");                     // the labels sit above all the finds (a find in front never hides a label)
  const fxPool = [0, 1, 2].map(() => { const n = el("div", "sprite fx"); n.hidden = true; return n; });   // dust, flying soil and sparks (3 can play at once)
  stage.append(el("div", "flicker f1"), el("div", "flicker f2"), el("div", "tarp"), winch, machineWrap, manWrap, slots, slotLabels, ...fxPool, findWrap, react);
  // ambient life: three groups of grass over the whole meadow that sway out of step, tree tops that lean (mid2 is the second frame), a tarp that flutters,
  // lanterns that flicker, two birds, drifting clouds. All of it stops under prefers-reduced-motion.
  world.append(layer("sky", "sky.png"), layer("twinkle", "twinkle.png"), el("div", "layer clouds"), layer("far", "far.png"), layer("ground", "ground.png"),
    el("div", "layer grass-all ga"), el("div", "layer grass-all gb"), el("div", "layer grass-all gc"), layer("mid", "mid.png"), layer("mid mid2", "mid2.png"),
    el("div", "bird"), el("div", "bird b2"), stage);
  const vignette = el("div", "vignette");
  const urgentEdge = el("div", "urgent-edge");               // the red edges of the last 5 seconds (see scene.urgent)
  root.append(world, vignette, urgentEdge);
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
    node.style.setProperty("--dur", `${seconds}s`);
    node.style.setProperty("--last", mode === "loop" ? 0 : frames - 1);
    node.classList.remove("once", "loop", "still");
    void node.offsetWidth;                                    // restart the CSS animation
    delay(node);
    node.classList.add(reduce.matches ? "still" : mode);
  }
  const hold = (node) => { node.classList.remove("once", "loop"); node.classList.add("still"); };
  const slide = (from, seconds) => {                           // the machine rolls in from the left
    machineWrap.style.setProperty("--from", `${from}px`);
    machineWrap.style.setProperty("--slide", `${seconds}s`);
    machineWrap.classList.remove("slide-in");
    void machineWrap.offsetWidth;
    delay(machineWrap);
    machineWrap.classList.add("slide-in");
  };

  const leave = (row, seconds) => {                           // the machine drives away to the left (the work is done)
    machineWrap.style.setProperty("--to", "-120px");
    machineWrap.style.setProperty("--slide", `${seconds}s`);
    machineWrap.classList.remove("slide-in", "slide-out");
    void machineWrap.offsetWidth;
    delay(machineWrap);
    machineWrap.classList.add("slide-out");
    play(machine, row, seconds, "loop");
    later(() => { machine.hidden = true; }, seconds + 0.05);
  };

  let timers = [];
  let cam = null;                                             // the camera push-in { step, left, right }: whole zoom steps added to the zoom (null = normal view); see camPlace() and paint()
  let hushed = false;
  let settleFn = null;
  let phaseWas = false;
  let clock = 0;                                              // seconds already elapsed in the beat (only used when opts.seek is set: screenshots, tests)
  const delay = (node) => { node.style.animationDelay = clock ? `-${clock}s` : ""; };
  const later = (fn, seconds) => {
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
    machine.hidden = find.hidden = sparkle.hidden = react.hidden = winch.hidden = findTag.hidden = true;
    winch.classList.remove("still", "once", "loop");
    findWrap.classList.remove("lift", "lifted", "held");
    fxPool.forEach((n) => { n.hidden = true; });
    machine.classList.remove("still", "once", "loop");
    machineWrap.classList.remove("slide-in", "slide-out");
    findWrap.classList.remove("carry", "carried");
    react.classList.remove("float", "slam", "still");
  };
  const phase = (on) => document.body.classList.toggle("phase-feedback", on);   // after an answer the question shrinks (CSS), the dig site stays clear

  // ---- the day's finds, kept on the bench: ONE straight row of 7 places, evenly spread, the order found from left to right, the rarity word under each ----
  const SLOT = { x: [40, 57, 75, 92, 109, 127, 144], foot: () => 118, sprite: { shard: 0, coin: 1, crown: 2, statue: 3, rock: 4 } };
  const labels = { ...BENCH_LABELS, ...(opts.benchLabels ?? {}) };
  let finds = [];                                              // the day's finds, by sprite name
  let pending = null;                                          // a find that is still in the pit or in his hands, waiting to go to the bench
  let pendingLabel = null;
  function placeFind(name, animate, label, from = [118, 60]) {  // put a find on the next free place (at most 7); animate = it flies over from where it was shown (the pit, or beside him)
    if (finds.length >= 7) return;
    const i = finds.length;
    finds.push(name);
    const foot = SLOT.foot(i);
    const slot = el("div", "sprite slot");
    slot.style.setProperty("--k", SLOT.sprite[name]);
    slot.style.left = `${SLOT.x[i] - 12}px`;
    slot.style.top = `${foot - 29}px`;
    slot.dataset.n = String(i + 1);
    if (animate && !reduce.matches) {
      slot.style.setProperty("--dx", `${from[0] - SLOT.x[i]}px`);
      slot.style.setProperty("--dy", `${from[1] - (foot - 14)}px`);
      delay(slot);
      slot.classList.add("fly");
    }
    const tag = el("div", "slot-label");                       // the rarity word in one or two short lines: real text (12 px on screen), on the face of the bench
    tag.dataset.key = FIND_KEY[name];
    tag.dataset.short = BENCH_SHORT[FIND_KEY[name]];
    tag.style.left = `${SLOT.x[i]}px`;
    tag.style.top = `${foot + 4}px`;
    for (const line of String(label ?? labels[FIND_KEY[name]]).split("\n")) tag.append(el("span", "", { textContent: line }));
    slots.append(slot);
    slotLabels.append(tag);
  }
  let pendingFrom = [118, 60];                                 // where the pending find is on screen (the pit, beside him, or hanging from the winch)
  function putPending(animate) {
    if (!pending) return;
    const name = pending;
    const label = pendingLabel;
    pending = null;
    pendingLabel = null;
    find.hidden = true;
    sparkle.hidden = true;
    findWrap.classList.remove("carry", "carried", "lift", "lifted", "held");
    findTag.hidden = true;
    placeFind(name, animate, label, pendingFrom);
    pendingFrom = [118, 60];
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
    const wasFeedback = phaseWas;
    urgent(false);
    celebrate(false);
    flush();
    cancel();
    hideActors();
    phase(false);
    phaseWas = false;
    if (wasFeedback && !document.body.classList.contains("no-hud")) sound.play("next");   // not on the end screen, where "finish" plays
    play(man, MAN.idle, 2.4, "loop");
    scheduleMicro();
  }

  // a quiet start beat for the first question: he looks around and settles his hat (not a dig)
  function ready() {
    urgent(false);
    celebrate(false);
    flush();
    cancel();
    hideActors();
    phase(false);
    phaseWas = false;
    if (reduce.matches) return play(man, MAN.idle, 2.4, "loop");
    play(man, MAN.ready, 1.2, "once");
    later(() => { play(man, MAN.idle, 2.4, "loop"); scheduleMicro(); }, 1.2);
    settleFn = () => { cancel(); play(man, MAN.idle, 2.4, "loop"); scheduleMicro(); };
    addEventListener("keydown", settleFn, { capture: true, once: true });
    addEventListener("pointerdown", settleFn, { capture: true, once: true });
  }

  // ---- after an answer ----
  // Every beat is a list of [seconds, action]; settle() runs the end state directly. Good answers get a build-up: rare about 1.9 s, very rare about 2.5 s.
  function dig(key, label, benchLabel, findName) {
    urgent(false);
    celebrate(false);
    flush();
    cancel();
    hideActors();
    phase(true);
    phaseWas = true;
    const k = DIG[key] ? key : "none";
    const d = DIG[k];
    pending = d.find;                                           // goes to the bench at the end of the beat
    pendingLabel = benchLabel ?? null;
    const text = label ?? REACTIONS[k];
    const big = k === "rare" || k === "veryRare";
    const findRow = FIND_ROW[d.find];
    const showLabel = () => {
      react.textContent = text;
      react.dataset.key = k;
      react.hidden = false;
      react.classList.remove("float", "slam", "still");
      void react.offsetWidth;
      delay(react);
      react.classList.add(reduce.matches ? "still" : big ? "slam" : "float");
    };
    const revealFind = (seconds) => { find.hidden = false; play(find, [findRow, 6], seconds, "once"); };
    const carryFind = () => { pendingFrom = [98, 30]; findWrap.classList.remove("carry"); void findWrap.offsetWidth; delay(findWrap); findWrap.classList.add(reduce.matches ? "carried" : "carry"); };
    const liftFind = () => { pendingFrom = [118, 48]; findWrap.classList.remove("lift"); void findWrap.offsetWidth; delay(findWrap); findWrap.classList.add(reduce.matches ? "lifted" : "lift"); };   // the winch hoists it 12 px
    const showTag = () => { findTag.textContent = findName ?? opts.findNames?.[d.find] ?? FIND_NAMES[d.find]; findTag.hidden = false; };   // the museum tag next to the find while it is held up
    const sparkles = () => { sparkle.hidden = false; play(sparkle, [0, 6], 0.5, "once"); };
    const vignetteOn = (strong) => root.classList.add("dim", ...(strong ? ["dim-strong"] : []));
    const vignetteOff = () => root.classList.remove("dim", "dim-strong");
    const rumble = (on) => world.classList.toggle("rumble", on);

    // the end state of every beat (also what reduced motion shows, and what a key press or tap jumps to)
    const finalState = () => {
      cancel();
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
    };

    if (reduce.matches) return finalState();
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
    const breath = (t, seconds) => later(() => { hushed = true; sound.hush(seconds); vignetteOff(); root.classList.add("dim", "dim-tight"); }, t);

    // v8: every good find is shown for a moment: it is lifted out, held up beside him (or hanging from the winch) with a small name tag, then it goes to the bench.
    const SHOW = 1.1;                                           // seconds a find is held up
    if (k === "rare") {                                         // about 8 s: the digger scoops five times, the camera pushes in, the digger leaves, a held breath, the crown
      vignetteOn(false);
      sound.play("swell-rare");
      machine.hidden = false;
      slide(-90, 0.35);
      play(machine, MACHINE.digger_drive, 0.4, "loop");
      play(man, MAN.watch_digger, 0.8, "loop");
      const CYC = 0.7;
      later(() => { play(machine, MACHINE.digger_dig, CYC, "loop"); rumble(true); }, 0.4);
      for (let i = 0; i < 4; i++) {
        const t = 0.4 + i * CYC;
        later(() => sound.play("dig-digger"), t);
        later(() => { fx("puff", 112, 56, 0.5); fx("soil", 104, 60, 0.45); }, t + 0.3);
        later(() => { fx("soil", 120, 58, 0.45); if (i % 2) { fx("clink", 100, 54, 0.3); sound.play("clink"); } }, t + 0.5);
      }
      push(1, 1.8, 16, 148);                                         // one zoom step closer, around the pit (and the vignette closes with it); he stands at the far left (x 18) watching the digger
      beats(0, 3.9, 1.2, 0.85);
      later(() => { rumble(false); leave(MACHINE.digger_drive, 0.35); fx("puff", 108, 62, 0.5); }, 3.25);
      breath(3.4, 1.5);                                         // everything goes quiet, the vignette closes round the pit
      later(() => play(man, MAN.peer, 0.9, "once"), 3.45);      // he steps up to the trench and looks in
      later(() => { vignetteOn(false); play(man, MAN.lean_crown, 0.8, "once"); }, 4.55);
      later(() => { revealFind(0.4); sound.play("reveal-rare"); root.classList.remove("dim-tight"); fx("puff", 112, 62, 0.5); }, 4.95);
      later(carryFind, 5.2);                                    // the crown rises with his hands ...
      push(0, 5.2);                                             // ... and the camera pulls back at once
      later(() => { play(man, MAN.rx_rare, 0.5, "once"); sparkles(); showLabel(); showTag(); vignetteOff(); }, 5.5);
      later(() => putPending(true), 5.5 + SHOW);                // after the show the crown flies to the bench
    } else if (k === "veryRare") {                              // about 10.5 s: he strikes something hard, a winch hauls earth OUT of the trench, two zoom steps, a held breath, the statue is lifted out
      vignetteOn(true);
      sound.play("swell-veryRare");
      strokes("pickaxe", 0.2, 2);                               // two strikes: the second one rings on something hard
      push(1, 1.5, 48, 148);
      later(() => { winch.hidden = false; play(winch, WINCH.rest, 1, "once"); hold(winch); fx("puff", 90, 80, 0.5); fx("puff", 152, 78, 0.5); sound.play("thud"); }, 1.6);   // the rig stands up beside the trench
      later(() => { play(man, MAN.crank, 0.8, "loop"); rumble(true); }, 1.7);
      const W = 1.0;                                            // one bucket per second: down, filled, up, tipped over the back of the trench, back
      for (let i = 0; i < 3; i++) {
        const t = 1.9 + i * W;
        if (i === 0) later(() => play(winch, WINCH.cycle, W, "loop"), t);
        later(() => sound.play("dig-digger"), t);
        later(() => { fx("soil", 119, 62, 0.45); fx("puff", 124, 66, 0.5); }, t + 0.15);              // earth leaves the trench: from the pit floor ...
        later(() => { fx("soil", 119, 20, 0.45); fx("puff", 126, 22, 0.5); }, t + 0.62);                // ... and tips behind it, onto the spoil heaps
        if (i % 2) later(() => { fx("clink", 112, 60, 0.3); sound.play("clink"); }, t + 0.3);
      }
      push(2, 3.2, 62, 148);                                    // a second zoom step (from here he works at the trench, x 63 and up; the last rim pixels may clip on a narrow phone)
      beats(0, 6.0, 2.4, 0.9);
      later(() => { rumble(false); play(winch, WINCH.rest, 1, "once"); hold(winch); }, 5.05);
      breath(5.1, 1.4);
      later(() => play(man, MAN.peer, 0.9, "once"), 5.15);
      later(() => vignetteOn(true), 6.3);
      later(() => { revealFind(0.45); sound.play("reveal-veryRare"); root.classList.remove("dim-tight"); fx("puff", 119, 62, 0.5); }, 6.5);
      later(() => { play(winch, WINCH.lift, 0.6, "once"); liftFind(); play(man, MAN.crank, 0.6, "once"); }, 7.0);   // the hook takes the statue and hoists it out
      push(0, 7.3);                                             // the camera pulls back as it rises
      later(() => { play(man, MAN.rx_veryRare, 0.6, "once"); sparkles(); showLabel(); showTag(); vignetteOff(); }, 7.7);
      later(() => putPending(true), 7.7 + SHOW + 0.2);
    } else {                                                    // common 4.5 s, uncommon 5.5 s, none 4 s: the tool works several times, he leans in and looks, brushes the find clean and holds it up
      const t = strokes(d.tool);
      const P = k === "none" ? 0.5 : 0.6;                       // the pause where he looks
      later(() => play(man, MAN.peer, P, "once"), t);
      const B = t + P;
      later(() => { play(man, MAN.brushoff, 0.7, "once"); fx("puff", 118, 70, 0.5); sound.play("brushoff"); }, B);
      later(() => { revealFind(0.5); sound.play(`reveal-${k}`); }, B + 0.1);
      later(() => fx("puff", 112, 66, 0.5), B + 0.4);
      later(carryFind, B + 0.75);                               // he lifts it out and holds it up beside him
      later(() => { play(man, MAN[`rx_${k}`], 0.5, "once"); showLabel(); showTag(); }, B + 0.95);
      later(() => putPending(true), B + 0.95 + SHOW);
    }
    clock = 0;
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
    for (let st = step; st > 0; st--) {
      const s = base.s + st;
      if ((right - left) * s > area.vw - 16 || 82 * s > area.bottom - area.top) continue;            // this step would not fit: try a smaller one
      let ox = area.vw / 2 - ((left + right) / 2 - 92) * s;                                           // the window left..right in the middle of the screen ...
      ox = Math.min(Math.max(ox, 8 - (left - 92) * s), area.vw - 8 - (right - 92) * s);               // ... but never past either edge
      const row20 = Math.min(Math.max((area.top + area.bottom) / 2 - 61 * s, area.top), area.bottom - 82 * s);   // screen y of stage row 20 (the rows 20 to 102 centred in the free area)
      return { s, ox: Math.round(ox), sy: Math.round(row20 / s - 20) };
    }
    return null;
  }
  function paint() {
    const p = cam && !reduce.matches ? camPlace(cam) : null;
    const { s, ox, sy } = p ?? base;
    root.style.setProperty("--s", s);
    root.style.setProperty("--sy", sy);
    root.style.setProperty("--ox", `${ox}px`);
    root.style.setProperty("--pitx", `${ox + 14 * s}px`);                // the tight vignette is centred between him and the pit (stage 106, 54)
    root.style.setProperty("--pity", `${(sy + 54) * s}px`);
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
    const need = 117;                                                   // native rows the stage needs: from the floating label (stage row 18) to the bottom of the bench (134)
    const sMin = Math.ceil(Math.max(vw / 640, vh / 460, 2));            // the picture must cover the screen
    const sWide = Math.max(Math.floor(vw / 125), 2);                    // the stage is about 125 art pixels wide
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
    const sy = Math.round(topUsed / s - 18);                            // the first row we need is stage row 18
    root.classList.toggle("z2", s < 3);                                 // at zoom 2 the bench labels use short codes (see BENCH_SHORT): 7 words do not fit 7 places 34 px apart
    base = { s, sy, ox: Math.round(vw / 2) };
    area = { top, bottom, vw };
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
  const newDay = () => { finds = []; pending = null; slots.replaceChildren(); slotLabels.replaceChildren(); };
  const setFinds = (list) => { newDay(); list.forEach((n) => placeFind(n, false)); };
  return { hud, idle, ready, dig, reset: idle, fit, sound, newDay, setFinds, urgent, celebrate, get finds() { return [...finds]; } };
}

// items: [{ find: "coin", label: "Gold coin" }, ...]  -> <ul class="museum">, one case per find (end screen, also the share image)
export function museum(items) {
  const list = el("ul", "museum");
  for (const { find, label } of items) {
    const li = el("li");
    li.append(el("img", "find-img", { src: sprite("finds", find), alt: "", decoding: "async" }), document.createTextNode(label));
    list.append(li);
  }
  return list;
}
