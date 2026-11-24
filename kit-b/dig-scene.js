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
//   scene.dig(key, label, benchLabel)                            // after an answer: common | uncommon | none about 2.5 s; rare about 2.1 s; veryRare about 2.6 s (dust, flying soil, a clink, a brush-off of the find);
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

// rows of man.png (8 columns of 128 x 80): name -> [row, frames]
const MAN = {
  idle: [0, 4], wipe: [1, 8], notebook: [2, 8], glance: [3, 6], scratch: [4, 8], flask: [5, 8], ready: [6, 6],
  brush: [7, 8], pickaxe: [8, 8], spoon: [9, 8], watch_digger: [10, 8], watch_truck: [11, 8], lean_crown: [12, 8], lift_statue: [13, 8],
  rx_none: [14, 8], rx_common: [15, 8], rx_uncommon: [16, 8], rx_rare: [17, 8], rx_veryRare: [18, 8], brushoff: [19, 8],
};
const MICRO = { wipe: 1.2, notebook: 1.6, glance: 1.2, scratch: 1.2, flask: 1.6 };       // idle micro-actions and how long each plays
const MACHINE = { digger_drive: [0, 4], digger_dig: [1, 8], truck_drive: [2, 4], truck_tip: [3, 8], truck_leave: [4, 4] };   // rows of machine.png (144 x 80)
const FIND_ROW = { shard: 0, coin: 1, crown: 2, statue: 3, rock: 4 };
const SPARKLE = new Set(["rare", "veryRare"]);
// where he stands inside his sheet row (art pixels from the frame's left edge): rows drawn at another spot make him walk there
const ANCHOR = { watch_digger: 32, watch_truck: 32, brushoff: 76, lean_crown: 76, lift_statue: 76, rx_rare: 76, rx_veryRare: 76 };
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
  findWrap.append(find, sparkle);
  const react = el("div", "react");
  const slots = el("div", "slots");                          // the finds bench: the day's finds stand here, in the order found
  const slotLabels = el("div", "slots");                     // the labels sit above all the finds (a find in front never hides a label)
  const fxPool = [0, 1, 2].map(() => { const n = el("div", "sprite fx"); n.hidden = true; return n; });   // dust, flying soil and sparks (3 can play at once)
  stage.append(el("div", "flicker f1"), el("div", "flicker f2"), el("div", "tarp"), machineWrap, manWrap, slots, slotLabels, ...fxPool, findWrap, react);
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
  let anchor = 52;
  const ROW_NAME = Object.fromEntries(Object.entries(MAN).map(([k, [r]]) => [r, k]));
  function walkTo(name) {                                      // he stands at another x in this row: slide there in steps instead of jumping
    const target = ANCHOR[name] ?? 52;
    if (target !== anchor && !reduce.matches) {
      manWrap.style.setProperty("--shift", `${anchor - target}px`);
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
    root.classList.remove("rumble", "dim", "dim-strong");
    world.classList.remove("rumble");
  };
  const hideActors = () => {
    machine.hidden = find.hidden = sparkle.hidden = react.hidden = true;
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
  function placeFind(name, animate, label) {                   // put a find on the next free place (at most 7); animate = it flies over from the pit
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
      slot.style.setProperty("--dx", `${118 - SLOT.x[i]}px`);
      slot.style.setProperty("--dy", `${60 - (foot - 14)}px`);
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
  function putPending(animate) {
    if (!pending) return;
    const name = pending;
    const label = pendingLabel;
    pending = null;
    pendingLabel = null;
    find.hidden = true;
    sparkle.hidden = true;
    findWrap.classList.remove("carry", "carried");
    placeFind(name, animate, label);
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
  const DUST_AT = { brush: [80, 86], pickaxe: [78, 90], spoon: [84, 90] };       // where each tool works, in stage coordinates

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
    if (reduce.matches) return;
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
  function dig(key, label, benchLabel) {
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
    const carryFind = () => { findWrap.classList.remove("carry"); void findWrap.offsetWidth; delay(findWrap); findWrap.classList.add(reduce.matches ? "carried" : "carry"); };
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
      machine.hidden = true;                                   // the end state: the machine has driven away
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

    if (k === "rare") {                                         // about 2.1 s
      vignetteOn(false);
      sound.play("rumble");
      machine.hidden = false;
      slide(-90, 0.35);
      play(machine, MACHINE.digger_drive, 0.4, "loop");
      play(man, MAN.watch_digger, 0.8, "loop");
      later(() => { play(machine, MACHINE.digger_dig, 0.6, "once"); rumble(true); sound.play("dig-digger"); }, 0.35);
      later(() => { fx("puff", 112, 56, 0.5); fx("soil", 104, 60, 0.45); }, 0.55);
      later(() => { fx("clink", 100, 54, 0.3); sound.play("clink"); fx("soil", 120, 58, 0.45); }, 0.75);
      later(() => { rumble(false); leave(MACHINE.digger_drive, 0.35); play(man, MAN.lean_crown, 0.6, "once"); fx("puff", 108, 62, 0.5); }, 1.0);
      later(() => { revealFind(0.35); sound.play("reveal-rare"); }, 1.2);
      later(carryFind, 1.35);                                    // the crown follows his hands as he pulls it up
      later(() => { play(man, MAN.rx_rare, 0.5, "once"); sparkles(); showLabel(); vignetteOff(); }, 1.6);
      later(() => putPending(true), 1.8);                       // the crown flies to the bench while he celebrates
    } else if (k === "veryRare") {                              // about 2.6 s
      vignetteOn(true);                                         // a beat of silence under the vignette, then the truck
      later(() => { machine.hidden = false; slide(-110, 0.45); play(machine, MACHINE.truck_drive, 0.45, "loop"); play(man, MAN.watch_truck, 0.8, "loop"); sound.play("rumble"); }, 0.3);
      later(() => { play(machine, MACHINE.truck_tip, 0.65, "once"); rumble(true); sound.play("dig-truck"); }, 0.75);
      later(() => { fx("soil", 104, 56, 0.45); }, 0.95);
      later(() => { fx("puff", 112, 58, 0.5); fx("soil", 116, 60, 0.45); }, 1.15);
      later(() => { rumble(false); leave(MACHINE.truck_leave, 0.35); play(man, MAN.lift_statue, 0.7, "once"); fx("puff", 110, 64, 0.5); }, 1.4);
      later(() => { revealFind(0.45); sound.play("reveal-veryRare"); }, 1.6);
      later(carryFind, 1.85);                                    // the statue follows his hands as he lifts it
      later(() => { play(man, MAN.rx_veryRare, 0.6, "once"); sparkles(); showLabel(); vignetteOff(); }, 2.1);
      later(() => putPending(true), 2.35);
    } else {                                                    // common, uncommon, none: about 2.5 s: he digs, dust and soil fly, a clink, then he brushes the find clean
      const [dx, dy] = DUST_AT[d.tool];
      const D = d.tool === "pickaxe" ? 1.2 : 1.0;               // how long the tool works
      sound.play(`dig-${d.tool}`);
      play(man, MAN[d.tool], D, "once");
      if (d.tool === "brush") { [0.15, 0.45, 0.75].forEach((t) => later(() => fx("puff", dx, dy, 0.45), t)); }
      if (d.tool === "pickaxe") {
        later(() => { fx("clink", dx, dy - 4, 0.3); fx("soil", dx, dy, 0.45); sound.play("clink"); }, 0.62);
        later(() => { fx("puff", dx + 2, dy, 0.5); fx("soil", dx + 4, dy, 0.45); }, 0.85);
      }
      if (d.tool === "spoon") {
        [0.15, 0.5].forEach((t) => later(() => { fx("soil", dx, dy, 0.4); fx("puff", dx, dy, 0.4); }, t));
        later(() => { fx("clink", dx + 6, dy - 4, 0.3); sound.play("clink"); }, 0.8);
      }
      later(() => { play(man, MAN.brushoff, 0.8, "once"); fx("puff", 106, 66, 0.5); sound.play("brushoff"); }, D);
      later(() => { revealFind(0.7); sound.play(`reveal-${k}`); }, D + 0.1);
      later(() => fx("puff", 112, 66, 0.5), D + 0.45);
      later(() => { play(man, MAN[`rx_${k}`], 0.5, "once"); showLabel(); }, D + 0.85);
      later(() => putPending(true), D + 1.2);
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

  // ---- fit: a whole-number zoom so every art pixel is the same size; the stage sits in the space below the panel ----
  function fit() {
    const vv = window.visualViewport;
    const vw = window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const root_ = document.documentElement;
    const compact = vh < 560;
    root_.classList.toggle("compact", compact);                         // keyboard open or a landscape phone: one-row bar, smaller panel
    root_.classList.remove("side");
    const hudBottom = () => (hudEl.hidden ? 12 : Math.ceil(hudEl.getBoundingClientRect().bottom));
    let ptop = hudBottom() + 10;
    const need = 117;                                                   // native rows the stage needs: from the floating label (stage row 18) to the bottom of the bench (134)
    const sMin = Math.ceil(Math.max(vw / 640, vh / 460, 2));            // the picture must cover the screen
    const sWide = Math.max(Math.floor(vw / 125), 2);                    // the stage is about 125 art pixels wide
    const reserve = compact ? 170 : Math.min(vh * 0.5, 340);            // room kept for the panel
    let top = ptop + reserve + 4;
    let sFit = Math.floor((vh - 8 - top) / need);
    let cx = vw / 2;                                                    // the screen x the stage is centred on
    const SIDE_W = Math.min(480, vw * 0.36);
    if (!compact && vw >= 900 && (sFit < 3 || hudEl.hidden)) {          // a wide screen that would only get zoom 2 under the panel (about 1280 x 720), or the intro / end screen: the panel moves to the right, the stage (and the cheering man) gets the left part and a bigger zoom
      root_.classList.add("side");
      cx = (vw - SIDE_W - 36) / 2;
      ptop = hudBottom() + 10;
      top = ptop;
      sFit = Math.floor((vh - 8 - top) / need);
    }
    const side = root_.classList.contains("side");
    const sCover = side ? Math.ceil((vw - cx) / 320) : sMin;
    const s = Math.max(sCover, 2, Math.min(4, sFit, side ? 4 : sWide));
    // centred in the space below the panel when it fits; when it does not (a short phone), it rises under the panel so the pit and the bench stay on screen
    const space = vh - 8 - top;
    const topUsed = Math.min(top + Math.max(space - need * s, 0) / 2, vh - 8 - need * s);
    const sy = Math.round(topUsed / s - 18);                            // the first row we need is stage row 18
    const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;     // on-screen keyboard (iOS keeps the layout viewport)
    root.classList.toggle("z2", s < 3);                                 // at zoom 2 the bench labels use short codes (see BENCH_SHORT): 7 words do not fit 7 places 34 px apart
    root.style.setProperty("--s", s);
    root.style.setProperty("--sy", sy);
    root.style.setProperty("--ox", `${Math.round(cx)}px`);
    const rs = root_.style;
    rs.setProperty("--cx", `${Math.round(cx)}px`);
    rs.setProperty("--kb", `${kb}px`);
    rs.setProperty("--vh", `${vh}px`);
    rs.setProperty("--ptop", `${ptop}px`);
  }
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
