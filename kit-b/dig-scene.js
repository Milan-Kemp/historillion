// Fullscreen dig scene for Historillion (2D kit, v2): a layered dusk scene, an animated archaeologist, a top bar with progress squares, a floating reaction.
// Built with createElement (no innerHTML). Assets load relative to this file.
//
//   import { mountScene, museum, DIG, REACTIONS } from "./kit-b/dig-scene.js";
//   const scene = mountScene();                                  // once at start-up: adds #scene (artwork) and #hud (top bar) before <main id="app">
//   scene.hud({ progress: { current: 3, total: 7 }, counter: t.question(3, 7), score: t.scoreLabel(total), timer, chip })
//        // progress = the 7 squares (filled = answered, current = highlighted); counter = the same in words, for screen readers (visually hidden);
//        // score = text of the score chip; timer = your <p class="timer" role="timer"> (moved into the bar; omit on the feedback screen); chip = optional text chip, top left
//   scene.hud(null)                                              // hide the bar (intro, end screen)
//   scene.ready()                                                // a question starts: he picks up his shovel (about 1 s, never blocks, any key or tap skips it)
//   scene.dig(key, label)                                        // after an answer: key = common | uncommon | rare | veryRare | none; label = the floating reaction text
//                                                                // (default REACTIONS[key]; put yours in js/strings/en.js). Takes about 1.3 s; any key or tap shows the end state at once.
//   scene.idle() / scene.reset()                                 // back to the idle pose
//
// The artwork is decorative (aria-hidden): the sentence in p.dig is its text alternative, the squares have the words in .sr. Under prefers-reduced-motion
// nothing moves: final still frames show and the reaction text appears without floating.

export const DIG = {
  common:   { tool: "brush",   find: "shard" },
  uncommon: { tool: "pickaxe", find: "coin" },
  rare:     { tool: "digger",  find: "crown" },
  veryRare: { tool: "truck",   find: "statue" },
  none:     { tool: "spoon",   find: "rock" },
};

// Default floating reactions (English). Put your own in js/strings/en.js and pass them to scene.dig(key, label).
export const REACTIONS = { none: "Nothing", common: "Common", uncommon: "Nice!", rare: "Rare find!", veryRare: "One in a million!" };

const MAN_ROW = { idle: 0, ready: 1, brush: 2, pickaxe: 3, digger: 4, truck: 5, spoon: 6, rx_none: 7, rx_common: 8, rx_uncommon: 9, rx_rare: 10, rx_veryRare: 11 };
const FIND_ROW = { shard: 0, coin: 1, crown: 2, statue: 3, rock: 4 };
const MACHINE_ROW = { digger: 0, truck: 1 };
const SPARKLE = new Set(["rare", "veryRare"]);
const T = { ready: 1.0, dig: 0.6, findAt: 0.35, find: 0.35, rxAt: 0.65, rx: 0.6, labelAt: 0.7, label: 0.5, sparkle: 0.5 };   // seconds; the whole beat is about 1.3 s

const asset = (name) => new URL(`./scene/${name}`, import.meta.url).href;
const sprite = (kind, name) => new URL(`./sprites/${kind}/${name}.png`, import.meta.url).href;

function el(tag, className, props = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.assign(node, props);
  return node;
}

export function mountScene(parent = document.body, opts = {}) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = { get matches() { return opts.still || mq.matches; } };      // opts.still = true: final frames at once (screenshots, tests)

  // ---- DOM: layers back to front, then the stage where the action happens ----
  const root = el("div", "", { id: "scene" });
  root.setAttribute("aria-hidden", "true");
  const world = el("div", "world");
  const layer = (cls, src) => el("img", `layer ${cls}`, { src: asset(src), alt: "", decoding: "async" });
  const sky = layer("sky", "sky.png");
  const twinkle = layer("twinkle", "twinkle.png");
  const clouds = el("div", "layer clouds");
  const far = layer("far", "far.png");
  const ground = layer("ground", "ground.png");
  const grass = el("div", "grass");
  const mid = layer("mid", "mid.png");
  const bird = el("div", "bird");
  const stage = el("div", "stage");
  const machine = el("div", "sprite machine");
  const man = el("div", "sprite man");
  const find = el("div", "sprite find");
  const sparkle = el("div", "sprite sparkle");
  const react = el("div", "react");
  stage.append(machine, man, find, sparkle, react);
  world.append(sky, twinkle, clouds, far, ground, grass, mid, bird, stage);
  root.append(world);
  const hudEl = el("div", "", { id: "hud" });
  parent.prepend(root, hudEl);

  // ---- sprite sheets played with CSS steps(): one row per animation, frames side by side ----
  function play(node, row, frames, seconds, mode) {            // mode: "once" (hold the last frame) | "loop"
    node.style.setProperty("--row", row);
    node.style.setProperty("--n", frames);
    node.style.setProperty("--n1", frames - 1);
    node.style.setProperty("--dur", `${seconds}s`);
    node.style.setProperty("--last", mode === "loop" ? 0 : frames - 1);
    node.classList.remove("once", "loop", "still");
    void node.offsetWidth;                                    // restart the CSS animation
    node.classList.add(reduce.matches ? "still" : mode);
  }
  const finish = (node) => { node.classList.remove("once", "loop"); node.classList.add("still"); };

  let timers = [];
  let settleFn = null;
  const later = (fn, seconds) => timers.push(setTimeout(fn, seconds * 1000));
  const cancel = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (settleFn) { removeEventListener("keydown", settleFn, true); removeEventListener("pointerdown", settleFn, true); settleFn = null; }
  };
  const hideActors = () => {
    machine.hidden = find.hidden = sparkle.hidden = react.hidden = true;
    react.classList.remove("float", "still");
  };

  const phase = (on) => document.body.classList.toggle("phase-feedback", on);   // after an answer the question shrinks (CSS), the dig site stays clear

  function idle() {
    cancel();
    hideActors();
    phase(false);
    play(man, MAN_ROW.idle, 4, 1.6, "loop");
  }

  function ready() {
    cancel();
    hideActors();
    phase(false);
    if (reduce.matches) return play(man, MAN_ROW.idle, 4, 1.6, "loop");
    play(man, MAN_ROW.ready, 4, T.ready, "once");
    later(() => play(man, MAN_ROW.idle, 4, 1.6, "loop"), T.ready);
    settleFn = () => idle();                                   // a key press or a tap ends the beat; the question is never blocked
    addEventListener("keydown", settleFn, { capture: true, once: true });
    addEventListener("pointerdown", settleFn, { capture: true, once: true });
  }

  function dig(key, label) {
    cancel();
    hideActors();
    phase(true);
    const k = DIG[key] ? key : "none";
    const d = DIG[k];
    const text = label ?? REACTIONS[k];
    const machineRow = MACHINE_ROW[d.tool];
    const showFind = () => { find.hidden = false; play(find, FIND_ROW[d.find], 6, T.find, "once"); };
    const showReaction = () => {
      play(man, MAN_ROW[`rx_${k}`], 6, T.rx, "once");
      if (SPARKLE.has(k)) { sparkle.hidden = false; play(sparkle, 0, 6, T.sparkle, "once"); }
    };
    const showLabel = () => {
      react.textContent = text;
      react.dataset.key = k;
      react.hidden = false;
      react.classList.remove("float", "still");
      void react.offsetWidth;
      react.classList.add(reduce.matches ? "still" : "float");
    };
    play(man, MAN_ROW[d.tool], 6, T.dig, "once");
    if (machineRow !== undefined) { machine.hidden = false; play(machine, machineRow, 6, T.dig, "once"); }
    if (reduce.matches) {                                      // no motion: everything at its end state, the reaction text still appears
      showFind(); showReaction(); showLabel();
      return;
    }
    later(showFind, T.findAt);
    later(showReaction, T.rxAt);
    later(showLabel, T.labelAt);
    settleFn = () => {                                         // Enter, a key or a tap: jump to the end state at once
      cancel();
      showFind(); showReaction(); showLabel();
      for (const n of [man, machine, find, sparkle]) finish(n);
      sparkle.hidden = true;
      react.classList.remove("float");
      react.classList.add("still");
    };
    addEventListener("keydown", settleFn, { capture: true, once: true });
    addEventListener("pointerdown", settleFn, { capture: true, once: true });
  }

  // ---- the top bar: progress squares, score chip (and an optional chip), timer ----
  function hud(info) {
    if (!info) {
      hudEl.hidden = true;
      document.body.classList.add("no-hud");
      return fit();
    }
    hudEl.hidden = false;
    document.body.classList.remove("no-hud");
    const row = el("div", "hud-row");
    const chip = el("p", "hud-chip", { textContent: info.chip ?? "" });
    chip.hidden = !info.chip;
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
    row.append(chip, q, el("p", "hud-score", { textContent: info.score ?? "" }));
    hudEl.replaceChildren(row, ...(info.timer ? [info.timer] : []));
    fit();
  }

  // ---- fit: a whole-number zoom so every art pixel is the same size; the stage sits in the space below the panel ----
  function fit() {
    const vv = window.visualViewport;
    const vw = window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const compact = vh < 560;
    document.documentElement.classList.toggle("compact", compact);   // keyboard open or a landscape phone: one-row bar, smaller panel
    const ptop = (hudEl.hidden ? 12 : Math.ceil(hudEl.getBoundingClientRect().bottom)) + 10;
    const reserve = compact ? 170 : Math.min(vh * 0.5, 340);           // room kept for the panel
    const top = ptop + reserve + 4;
    const need = 88;                                                   // native rows the stage needs: from the floating label (stage row 12) to the pit floor (100)
    const sMin = Math.ceil(Math.max(vw / 640, vh / 460, 2));
    const sFit = Math.floor(Math.max(vh - 8 - top, need * 2) / need);
    const sWide = Math.max(Math.floor(vw / 125), 2);                   // the stage is about 125 art pixels wide
    const s = Math.max(sMin, Math.min(4, sFit, sWide));
    const sy = Math.round((top + Math.max(vh - 8 - top - need * s, 0) / 2) / s - 12);   // the first row we need is stage row 12
    const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;     // on-screen keyboard (iOS keeps the layout viewport)
    root.style.setProperty("--s", s);
    root.style.setProperty("--sy", sy);
    root.style.setProperty("--ox", `${Math.round(vw / 2)}px`);
    const rs = document.documentElement.style;
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
  return { hud, idle, ready, dig, reset: idle, fit };
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
