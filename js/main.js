import { t } from "./strings/en.js";
import { match, suggest } from "./matching.js";
import { points, rarityKey } from "./scoring.js";
import { scoreDistribution, bins, percentile } from "./distribution.js";
import { resultsList } from "./answers.js";
import { loadDays, saveDay, stats } from "./progress.js";

// ?kit=b shows the second style kit (2d) for comparison. Default is the 8-bit kit.
const KIT = new URLSearchParams(location.search).get("kit") === "b" ? "kit-b" : "kit";
// The 2d kit shows the excavation field (v15, dig-scene.js + field.js: seven squares, one per answer, dug deeper into older layers the rarer the answer); ?scene=world the worlds (v13), ?scene=shaft the cross-section (v12, in metres).
const SCENE_PARAM = new URLSearchParams(location.search).get("scene");
const SCENE = KIT !== "kit-b" ? null : SCENE_PARAM === "world" || SCENE_PARAM === "shaft" ? SCENE_PARAM : "pit";
const SHAFT = SCENE === "world" || SCENE === "shaft"; // a scene module of its own (world-scene.js or shaft-scene.js), with coreSample for the end screen
if (SCENE) document.body.dataset.scene = SCENE; // css/answers.css: the field keeps its squares in view on the end screen
const METRES = SCENE === "shaft";                    // only the cross-section counts in metres
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
if (KIT === "kit-b") {
  // layout-phone.css (v10: question without a box, answer bar at the bottom, one big word) comes right after theme.css, before our own css/answers.css
  const layout = document.createElement("link");
  layout.rel = "stylesheet";
  layout.href = "kit-b/layout-phone.css";
  document.getElementById("theme").after(layout);
  const sheets = [layout];
  const sceneCss = document.createElement("link"); // field.css, world.css or shaft.css comes right after layout-phone.css
  sceneCss.rel = "stylesheet";
  sceneCss.href = `kit-b/${SCENE === "pit" ? "field" : SCENE}.css`;
  layout.after(sceneCss);
  sheets.push(sceneCss);
  await Promise.all(sheets.map((l) => new Promise((done) => { l.onload = l.onerror = done; })));
}
const kit = await import(`../${KIT}/dig-scene.js`);
const { museum, DIG } = kit;
// Only the 2d kit has mountScene (fullscreen scene). The 8-bit kit has digScene (a picture inside the panel).
// DIG (which find goes with which rarity) and museum() still come from dig-scene.js; the scene itself from world-scene.js or shaft-scene.js.
const shaft = SHAFT ? await import(`../${KIT}/${SCENE}-scene.js`) : null;
const scene = (shaft ?? kit).mountScene?.(document.body, { benchLabels: t.benchLabel });
const scoreText = (n) => (METRES ? t.depthLabel(n) : t.scoreLabel(n)); // in the cross-section the score IS the depth
// The new end screen (curve, ranks, finds list) only exists in the 2d kit.
const endKit = scene ? await import(`../${KIT}/end-screen.js`) : null;

// ?replay=1 is for testing: play today's dig again, nothing is saved.
const REPLAY = new URLSearchParams(location.search).has("replay");
const SECONDS = 25;
const CURVE_MAX = 560;
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
  const days = loadDays();
  const s = stats(days, day.date);
  const logbook = s.played ? [el("p", { className: "logbook", textContent: t.logbook(s) })] : [];
  const today = REPLAY ? null : days[day.date];
  if (today) { // one dig a day: today's is done, show it again instead of playing it again
    const results = today.map((r) => ({ ...r, typed: r.typed ?? "", dig: t.dig[r.key] }));
    show(
      el("h1", { textContent: t.title }),
      el("p", { textContent: (METRES ? t.dugToday : t.doneToday)(results.reduce((x, r) => x + r.pts, 0)) }),
      ...logbook,
      ...(endKit ? [endKit.nextDig({ label: t.nextDig })] : []),
      el("button", { textContent: t.viewResults, onclick: () => end(day, results, true) }),
    );
    return;
  }
  show(
    el("h1", { textContent: t.title }),
    el("p", { textContent: METRES ? t.taglineDepth : SHAFT ? t.taglineWorlds : SCENE ? t.taglinePit : t.tagline }),
    el("p", { textContent: METRES ? t.howDepth : SHAFT ? t.howWorlds : SCENE ? t.howPit : t.howScoring }),
    ...logbook,
    el("button", { textContent: t.start, onclick: () => { scene?.sound.play("start"); ask(day, 0, []); } }),
  );
}

function ask(day, i, results) {
  const question = day.questions[i];
  const timer = el("p", { className: "timer", role: "timer", textContent: t.seconds(SECONDS) });
  const input = el("input", { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: false, placeholder: t.placeholder, "aria-label": question.prompt });
  input.setAttribute("autocorrect", "off"); // a property in Chrome (boolean), so it must be set as attribute
  const form = el("form", {}, input, el("button", { type: "submit", textContent: t.submit }));
  const msg = el("p", { className: "msg", role: "status" }); // live region: screen readers announce the hint
  const total = results.reduce((s, r) => s + r.pts, 0);
  if (scene) {
    scene.hud({ progress: { current: i + 1, total: day.questions.length }, counter: t.question(i + 1, day.questions.length), score: scoreText(total), timer, soundLabel: t.soundLabel });
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
  let dug = null;
  const hud = (score) => scene.hud({ progress: { current: i + 1, total: day.questions.length }, counter: t.question(i + 1, day.questions.length), score: scoreText(score), soundLabel: t.soundLabel });
  if (scene) {
    hud(total - r.pts); // the points are not counted before the find is out of the ground
    dug = shaft ? scene.dig(r.key, r.pts) : scene.dig(r.key, r.pts, { label: t.reaction[r.key], benchLabel: t.benchLabel[r.key] });
  }
  const typed = r.typed.trim() || "-";
  const next = el("button", { textContent: last ? t.finish : t.next, onclick: () => (last ? end(day, results) : ask(day, i + 1, results)) });
  const rarityLine = r.rarity + (r.share ? `. ${t.shareOf(Math.round(r.share * 100))}` : "");
  if (scene) {
    // "Your answer: king tut -> Tutankhamun" when the counted answer is another word than what was typed
    const counted = r.name && r.name.toLowerCase() !== typed.toLowerCase() ? ` \u2192 ${r.name}` : "";
    const word = el("p", { className: "rarity-word wait", textContent: t.rarityWord[r.key] });
    word.dataset.key = r.key;
    show(
      el("h2", { textContent: r.prompt }),
      el("p", { className: "your-answer", textContent: `${t.yourAnswer}: ${typed}${counted}` }),
      word,
      el("p", { className: "points wait", textContent: METRES ? t.metres(r.pts) : `+${r.pts}` }),
      el("p", { className: "rarity-line wait", textContent: rarityLine }),
      el("p", { className: "dig wait", textContent: t.youDug(r.dig.tool, r.dig.find) }),
      el("p", { className: "explain wait", textContent: r.text }),
      next,
    );
    // the result waits for the dig: every 2d scene's dig() resolves when the find is out of the ground (or at once when skipped). Next is never blocked.
    dug.then(() => {
      if (!word.isConnected) return; // the player already went on with Next
      app.querySelectorAll(".wait").forEach((n) => n.classList.remove("wait"));
      hud(total);
    });
    return;
  }
  show(
    el("p", { textContent: t.question(i + 1, day.questions.length) }),
    el("h2", { textContent: r.prompt }),
    kit.digScene(DIG[r.key].tool, DIG[r.key].find),
    el("p", { textContent: `${t.yourAnswer}: ${typed}` }),
    ...(r.name ? [el("p", { textContent: t.matchedAs(r.name) })] : []),
    el("p", { className: "dig", textContent: t.youDug(r.dig.tool, r.dig.find) }),
    el("p", { className: "points", textContent: t.points(r.pts) }),
    el("p", { textContent: rarityLine }),
    el("p", { textContent: r.text }),
    next,
  );
}

function end(day, results, review = false) {
  scene?.hud(null);
  scene?.reset();
  if (review) scene?.setDay(results.map((r) => ({ key: r.key, points: r.pts }))); // a stored day: dug again, without animation
  else scene?.sound.play("finish");
  const total = results.reduce((s, r) => s + r.pts, 0);
  const days = REPLAY || review ? loadDays() : saveDay(day.date, results);
  const st = stats(days, day.date);
  const logbook = st.played ? [el("p", { className: "logbook", textContent: t.logbook(st) })] : []; // nothing to show before the first stored day (or in ?replay mode)
  const again = REPLAY ? [el("button", { textContent: t.playAgain, onclick: () => location.reload() })] : [];
  if (scene && total >= t.ranks.at(-1).from) scene.celebrate(); // the top rank, "One in a Historillion"
  if (endKit) {
    document.body.classList.add("phase-end"); // css/answers.css centres the results panel on the screen
    // The curve is an estimate from predicted answer shares (no real players yet); endCurve prints that too.
    const dist = scoreDistribution(day);
    show(
      ...(shaft ? [shaft.coreSample({ finds: scene.finds, depth: total, label: METRES ? t.coreLabel : t.worldsLabel })] : []), // the day's dig: the column (shaft) or the strip of worlds
      el("h1", { className: "total" }, el("span", { className: "sr", textContent: `${t.total}: ` }), METRES ? t.depthLabel(total) : String(total)),
      el("p", { className: "sub", textContent: METRES ? t.reached(total, shaft.eraAt(total).name) : SHAFT ? t.reachedWorld(shaft.eraAt(total).name) : t.deepest(kit.eraAt(Math.max(0, ...results.map((r) => r.pts))).name) }),
      ...logbook,
      // the curve and ranks run to 560 (the top 0.1 % is near 460); "One in a Historillion" starts at the tomb, 420
      endKit.endCurve({ bins: bins(dist, 20, CURVE_MAX), total, percentile: Math.min(percentile(dist, total), 0.99), labels: t.curve, max: CURVE_MAX, topFrom: t.ranks.at(-1).from, unit: METRES ? " m" : "" }),
      endKit.rankList({ total, ranks: t.ranks, title: t.ranksTitle, unit: METRES ? " m" : "" }),
      resultsList({
        day, t: METRES ? { ...t, pointsShort: "m", plus: t.metres } : t, spriteUrl: (name) => `${KIT}/sprites/finds/${name}.png`,
        results: results.map((r) => ({ prompt: r.prompt, typed: r.typed, name: r.name, rarity: r.rarity, find: DIG[r.key].find, findLabel: r.dig.find, pts: r.pts })),
      }),
      endKit.nextDig({ label: t.nextDig }),
      ...again,
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
    ...logbook,
    museum(results.map((r) => ({ find: DIG[r.key].find, label: r.dig.find }))),
    el("table", {},
      el("thead", {}, el("tr", {}, ...[t.questionCol, t.yourAnswer, t.rarityCol, t.findCol, t.pointsCol].map((h) => el("th", { textContent: h })))),
      el("tbody", {}, ...rows)),
    ...again,
  );
}

loadDay().then(intro).catch(() => show(el("p", { textContent: t.loadError })));
