import { t } from "./strings/en.js";
import { match, suggest } from "./matching.js";
import { points, rarityKey } from "./scoring.js";
import { scoreDistribution, bins, percentile } from "./distribution.js";
import { resultsList } from "./answers.js";

// ?kit=b shows the second style kit (2d) for comparison. Default is the 8-bit kit.
const KIT = new URLSearchParams(location.search).get("kit") === "b" ? "kit-b" : "kit";
document.getElementById("theme").href = `${KIT}/theme.css`;
document.getElementById("icon").href = `${KIT}/brand/favicon.png`;
// How see-through the panels are. Default: very light glass. ?glass=clear (no background, no blur), ?glass=soft (the previous light glass),
// ?glass=classic (the kit's own, darker 38 % glass). The text halo follows the glass automatically (the kit reads --glass).
const GLASS = {
  clear: ["transparent", "none"],
  light: ["rgba(24, 12, 20, 0.10)", "blur(5px) brightness(0.88)"],
  soft: ["rgba(24, 12, 20, 0.16)", "blur(6px) brightness(0.8)"],
}[new URLSearchParams(location.search).get("glass") ?? "light"];
if (GLASS && KIT === "kit-b") { document.documentElement.style.setProperty("--glass", GLASS[0]); document.documentElement.style.setProperty("--blur", GLASS[1]); }
const kit = await import(`../${KIT}/dig-scene.js`);
const { museum, DIG } = kit;
// Only the 2d kit has mountScene (fullscreen scene). The 8-bit kit has digScene (a picture inside the panel).
const scene = kit.mountScene?.();
// The new end screen (curve, ranks, finds list) only exists in the 2d kit.
const endKit = scene ? await import(`../${KIT}/end-screen.js`) : null;

const SECONDS = 25;
const READ_SECONDS = 3; // time to read the question before the clock starts
const app = document.getElementById("app");

// Elements are built with textContent, never innerHTML: player input is untrusted.
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  // Real DOM properties are assigned; the rest (aria-label, autocorrect) must be attributes.
  for (const [k, v] of Object.entries(props)) (k in node ? (node[k] = v) : node.setAttribute(k, v));
  node.append(...kids);
  return node;
}
function show(...nodes) {
  app.replaceChildren(...nodes);
  app.scrollTop = 0; // a long screen (the end screen) must open at its top, not at the focused button below
  (app.querySelector("input, button") ?? app).focus({ preventScroll: true });
}

// UTC, so every player worldwide gets the same day at the same moment.
// ?day=YYYY-MM-DD is for testing. Without a file for today we use the latest earlier day.
async function loadDay() {
  const days = await (await fetch("data/days/index.json")).json();
  const wanted = new URLSearchParams(location.search).get("day") ?? new Date().toISOString().slice(0, 10);
  const sorted = [...days].sort();
  const date = sorted.includes(wanted) ? wanted : sorted.filter((d) => d <= wanted).pop() ?? sorted[0];
  return (await fetch(`data/days/${date}.json`)).json();
}

function grade(input, question) {
  const m = match(input, question);
  if (m.kind === "answer") {
    const share = m.entry.prior_share;
    const key = rarityKey(share);
    return { pts: points(share), rarity: t.rarity[key], share, name: m.entry.canonical, text: m.entry.explanation, key, dig: t.dig[key] };
  }
  if (m.kind === "rejected") return { pts: 0, rarity: t.rejected, rejected: true, text: m.entry.explanation, key: "none", dig: t.dig.none };
  return { pts: 0, rarity: "-", text: input.trim() ? t.noMatch : t.empty, key: "none", dig: t.dig.none };
}

function intro(day) {
  scene?.hud(null);
  scene?.idle();
  show(
    el("h1", { textContent: t.title }),
    el("p", { textContent: t.tagline }),
    el("p", { textContent: t.howScoring }),
    el("button", { textContent: t.start, onclick: () => ask(day, 0, []) }),
  );
}

function ask(day, i, results) {
  waiting?.disconnect();
  const question = day.questions[i];
  const timer = el("p", { className: "timer", role: "timer", textContent: t.seconds(SECONDS) });
  const input = el("input", { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: false, placeholder: t.placeholder, "aria-label": question.prompt });
  input.setAttribute("autocorrect", "off"); // a property in Chrome (boolean), so it must be set as attribute
  const form = el("form", {}, input, el("button", { type: "submit", textContent: t.submit }));
  const msg = el("p", { className: "msg", role: "status" }); // live region: screen readers announce the hint
  const total = results.reduce((s, r) => s + r.pts, 0);
  if (scene) {
    scene.hud({ progress: { current: i + 1, total: day.questions.length }, counter: t.question(i + 1, day.questions.length), score: t.scoreLabel(total), timer, soundLabel: t.soundLabel });
    // The "picks up his shovel" beat looks like digging for no reason, so only the first question gets it.
    if (i === 0) { scene.newDay(); scene.ready(); } else scene.idle();
    show(el("h2", { textContent: question.prompt }), msg, form);
  } else {
    show(
      el("p", { textContent: t.question(i + 1, day.questions.length) }),
      kit.digScene(null, null),
      el("h2", { textContent: question.prompt }),
      timer, msg, form,
    );
  }
  timer.style.setProperty("--secs", `${SECONDS}s`);
  input.focus();

  const start = performance.now() + READ_SECONDS * 1000;
  const deadline = start + SECONDS * 1000;
  let lastTick = null;
  let done = false;
  let autofilled = null; // the suggestion we filled in after a typo; it only counts once the player confirms it with Enter
  let last = null; // last wrong try, shown on the feedback screen if time runs out
  const finish = (typed, g) => {
    done = true;
    clearInterval(tick);
    results.push({ prompt: question.prompt, typed, ...g });
    feedback(day, i, results);
  };
  // A real answer ends the question. A wrong or unknown one only shows a hint: you can keep trying.
  const submit = () => {
    if (done) return;
    scene?.sound.play("submit");
    const typed = input.value;
    if (!typed.trim()) { msg.textContent = t.typeSomething; return; }
    const g = grade(typed, question);
    if (g.name) return finish(typed, g);
    last = { typed, g };
    const hint = g.rejected ? null : suggest(typed, question);
    if (hint) {
      autofilled = input.value = hint.canonical; // "Nerooo" + Enter fills in "Nero"; one more Enter confirms it, typing replaces it
      msg.textContent = t.didYouMean(hint.canonical);
      input.select();
    } else {
      autofilled = null;
      msg.textContent = g.rejected ? g.text : t.notRecognised;
      input.value = "";
    }
    scene?.sound.play(hint ? "hint" : "wrong");
    input.focus();
  };
  const timeUp = () => {
    if (done) return;
    const typed = input.value;
    const g = typed.trim() && typed !== autofilled ? grade(typed, question) : null;
    if (g?.name) return finish(typed, g);
    const l = g ? { typed, g } : last;
    finish(l?.typed ?? "", l?.g ?? grade("", question));
  };
  const tick = setInterval(() => {
    const now = performance.now();
    if (now < start) { // reading time: the clock (and its bar) wait
      timer.classList.add("reading");
      timer.textContent = t.readFirst(Math.ceil((start - now) / 1000));
      return;
    }
    timer.classList.remove("reading");
    const left = Math.ceil((deadline - now) / 1000);
    timer.textContent = t.seconds(Math.max(left, 0));
    timer.classList.toggle("low", left <= SECONDS / 4);
    if (left <= 5 && left > 0 && left !== lastTick) { lastTick = left; scene?.sound.play("tick"); }
    scene?.urgent(left <= 5 && left > 0);
    if (left <= 0) timeUp();
  }, 100);
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
}

function feedback(day, i, results) {
  const r = results[i];
  const last = i === day.questions.length - 1;
  const total = results.reduce((s, x) => s + x.pts, 0);
  const hud = (score) => scene.hud({ progress: { current: i + 1, total: day.questions.length }, counter: t.question(i + 1, day.questions.length), score: t.scoreLabel(score), soundLabel: t.soundLabel });
  if (scene) {
    hud(total - r.pts); // the points are not counted before the find is out of the ground
    scene.dig(r.key, t.reaction[r.key], t.benchLabel[r.key]);
  }
  show(
    ...(scene ? [] : [el("p", { textContent: t.question(i + 1, day.questions.length) })]),
    el("h2", { textContent: r.prompt }),
    ...(scene ? [] : [kit.digScene(DIG[r.key].tool, DIG[r.key].find)]),
    el("p", { textContent: `${t.yourAnswer}: ${r.typed.trim() || "-"}` }),
    ...(r.name ? [el("p", { textContent: t.matchedAs(r.name) })] : []),
    el("p", { className: "dig", textContent: t.youDug(r.dig.tool, r.dig.find) }),
    el("p", { className: "points", textContent: t.points(r.pts) }),
    el("p", { className: "rarity-line", textContent: r.rarity + (r.share ? `. ${t.shareOf(Math.round(r.share * 100))}` : "") }),
    el("p", { textContent: r.text }),
    el("button", { textContent: last ? t.finish : t.next, onclick: () => (last ? end(day, results) : ask(day, i + 1, results)) }),
  );
  if (scene) revealWhenDug(app.querySelectorAll(".dig, .points, .rarity-line"), () => hud(total));
}

// The result (points, what he dug up, how rare) waits for the dig: it shows when the scene shows its reaction label, which is when the find is out of the
// ground, or at once when the beat is skipped (key, Enter or tap) or with reduced motion. Next is never blocked.
let waiting = null;
function revealWhenDug(nodes, done) {
  waiting?.disconnect();
  const react = document.querySelector("#scene .react");
  const show = () => { nodes.forEach((n) => n.classList.remove("wait")); done(); };
  if (!react || !react.hidden) return show();
  nodes.forEach((n) => n.classList.add("wait"));
  waiting = new MutationObserver(() => { if (!react.hidden) { waiting.disconnect(); show(); } });
  waiting.observe(react, { attributes: true, attributeFilter: ["hidden"] });
}

function end(day, results) {
  waiting?.disconnect();
  scene?.hud(null);
  scene?.reset();
  scene?.sound.play("finish");
  const total = results.reduce((s, r) => s + r.pts, 0);
  if (scene && total >= t.ranks.at(-1).from) scene.celebrate(); // the top rank, "One in a Historillion"
  if (endKit) {
    document.body.classList.add("phase-end"); // css/answers.css centres the results panel on the screen
    // The curve is an estimate from predicted answer shares (no real players yet); endCurve prints that too.
    const dist = scoreDistribution(day);
    show(
      el("h1", { className: "total" }, el("span", { className: "sr", textContent: `${t.total}: ` }), String(total)),
      el("p", { className: "sub", textContent: t.totalLabel }),
      endKit.endCurve({ bins: bins(dist), total, percentile: Math.min(percentile(dist, total), 0.99), labels: t.curve }),
      endKit.rankList({ total, ranks: t.ranks, title: t.ranksTitle }),
      resultsList({
        day, t, spriteUrl: (name) => `${KIT}/sprites/finds/${name}.png`,
        results: results.map((r) => ({ prompt: r.prompt, typed: r.typed, name: r.name, rarity: r.rarity, find: DIG[r.key].find, findLabel: r.dig.find, pts: r.pts })),
      }),
      endKit.nextDig({ label: t.nextDig }),
      el("button", { textContent: t.playAgain, onclick: () => location.reload() }),
    );
    return;
  }
  const rows = results.map((r) => el("tr", {},
    el("td", { textContent: r.prompt, "data-label": t.questionCol }),
    el("td", { textContent: r.typed.trim() || "-", "data-label": t.yourAnswer }),
    el("td", { textContent: r.rarity, "data-label": t.rarityCol }),
    el("td", { textContent: r.dig.find, "data-label": t.findCol }),
    el("td", { textContent: r.pts, "data-label": t.pointsCol }),
  ));
  show(
    el("h1", { textContent: `${t.total}: ${total}` }),
    museum(results.map((r) => ({ find: DIG[r.key].find, label: r.dig.find }))),
    el("table", {},
      el("thead", {}, el("tr", {}, ...[t.questionCol, t.yourAnswer, t.rarityCol, t.findCol, t.pointsCol].map((h) => el("th", { textContent: h })))),
      el("tbody", {}, ...rows)),
    el("button", { textContent: t.playAgain, onclick: () => location.reload() }),
  );
}

loadDay().then(intro).catch(() => show(el("p", { textContent: t.loadError })));
