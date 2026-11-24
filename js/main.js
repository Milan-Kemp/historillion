import { t } from "./strings/en.js";
import { match, suggest } from "./matching.js";
import { points, rarityKey } from "./scoring.js";

// ?kit=b shows the second style kit (2d) for comparison. Default is the 8-bit kit.
const KIT = new URLSearchParams(location.search).get("kit") === "b" ? "kit-b" : "kit";
document.getElementById("theme").href = `${KIT}/theme.css`;
document.getElementById("icon").href = `${KIT}/brand/favicon.png`;
const kit = await import(`../${KIT}/dig-scene.js`);
const { museum, DIG } = kit;
// Only the 2d kit has mountScene (fullscreen scene). The 8-bit kit has digScene (a picture inside the panel).
const scene = kit.mountScene?.();

const SECONDS = 20;
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
  (app.querySelector("input, button") ?? app).focus();
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
  const question = day.questions[i];
  const timer = el("p", { className: "timer", role: "timer", textContent: t.seconds(SECONDS) });
  const input = el("input", { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: false, placeholder: t.placeholder, "aria-label": question.prompt });
  input.setAttribute("autocorrect", "off"); // a property in Chrome (boolean), so it must be set as attribute
  const form = el("form", {}, input, el("button", { type: "submit", textContent: t.submit }));
  const msg = el("p", { className: "msg", role: "status" }); // live region: screen readers announce the hint
  const total = results.reduce((s, r) => s + r.pts, 0);
  if (scene) {
    scene.hud({ progress: { current: i + 1, total: day.questions.length }, counter: t.question(i + 1, day.questions.length), score: t.scoreLabel(total), timer });
    scene.ready();
    show(el("h2", { textContent: question.prompt }), form, msg);
  } else {
    show(
      el("p", { textContent: t.question(i + 1, day.questions.length) }),
      kit.digScene(null, null),
      el("h2", { textContent: question.prompt }),
      timer, form, msg,
    );
  }
  timer.style.setProperty("--secs", `${SECONDS}s`);
  input.focus();

  const deadline = performance.now() + SECONDS * 1000;
  let done = false;
  let hint = null; // the current "did you mean" suggestion
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
    const typed = input.value;
    if (!typed.trim()) {
      // Enter on an empty field after a "did you mean" hint fills in the suggestion; the next Enter submits it.
      if (hint) { input.value = hint.canonical; hint = null; msg.textContent = t.pressEnter; return; }
      msg.textContent = t.typeSomething;
      return;
    }
    hint = null;
    const g = grade(typed, question);
    if (g.name) return finish(typed, g);
    last = { typed, g };
    hint = g.rejected ? null : suggest(typed, question);
    if (hint) {
      const suggestion = hint;
      const yes = el("button", { type: "button", textContent: `→ ${suggestion.canonical}`, onclick: () => { input.value = suggestion.canonical; submit(); } });
      msg.replaceChildren(`${t.didYouMean} `, yes, ` ${t.orEnter}`);
    } else msg.textContent = g.rejected ? g.text : t.notRecognised;
    input.value = "";
    input.focus();
  };
  const timeUp = () => {
    if (done) return;
    const typed = input.value;
    const g = typed.trim() ? grade(typed, question) : null;
    if (g?.name) return finish(typed, g);
    const l = g ? { typed, g } : last;
    finish(l?.typed ?? "", l?.g ?? grade("", question));
  };
  const tick = setInterval(() => {
    const left = Math.ceil((deadline - performance.now()) / 1000);
    timer.textContent = t.seconds(Math.max(left, 0));
    timer.classList.toggle("low", left <= SECONDS / 4);
    if (left <= 0) timeUp();
  }, 100);
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
}

function feedback(day, i, results) {
  const r = results[i];
  const last = i === day.questions.length - 1;
  const total = results.reduce((s, x) => s + x.pts, 0);
  if (scene) {
    scene.hud({ progress: { current: i + 1, total: day.questions.length }, counter: t.question(i + 1, day.questions.length), score: t.scoreLabel(total) });
    scene.dig(r.key, t.reaction[r.key]);
  }
  show(
    ...(scene ? [] : [el("p", { textContent: t.question(i + 1, day.questions.length) })]),
    el("h2", { textContent: r.prompt }),
    ...(scene ? [] : [kit.digScene(DIG[r.key].tool, DIG[r.key].find)]),
    el("p", { textContent: `${t.yourAnswer}: ${r.typed.trim() || "-"}` }),
    ...(r.name ? [el("p", { textContent: t.matchedAs(r.name) })] : []),
    el("p", { className: "dig", textContent: t.youDug(r.dig.tool, r.dig.find) }),
    el("p", { className: "points", textContent: t.points(r.pts) }),
    el("p", { textContent: r.rarity + (r.share ? `. ${t.shareOf(Math.round(r.share * 100))}` : "") }),
    el("p", { textContent: r.text }),
    el("button", { textContent: last ? t.finish : t.next, onclick: () => (last ? end(results) : ask(day, i + 1, results)) }),
  );
}

function end(results) {
  scene?.hud(null);
  scene?.reset();
  const total = results.reduce((s, r) => s + r.pts, 0);
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
