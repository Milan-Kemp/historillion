import { t } from "./strings/en.js";
import { match } from "./matching.js";
import { points, rarityKey } from "./scoring.js";

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
    return { pts: points(share), rarity: t.rarity[rarityKey(share)], share, name: m.entry.canonical, text: m.entry.explanation };
  }
  if (m.kind === "rejected") return { pts: 0, rarity: t.rejected, text: m.entry.explanation };
  return { pts: 0, rarity: "-", text: input.trim() ? t.noMatch : t.empty };
}

function intro(day) {
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
  show(
    el("p", { textContent: t.question(i + 1, day.questions.length) }),
    el("h2", { textContent: question.prompt }),
    timer, form,
  );
  input.focus();

  const deadline = performance.now() + SECONDS * 1000;
  let done = false;
  const submit = () => {
    if (done) return;
    done = true;
    clearInterval(tick);
    const typed = input.value;
    const g = grade(typed, question);
    results.push({ prompt: question.prompt, typed, ...g });
    feedback(day, i, results);
  };
  const tick = setInterval(() => {
    const left = Math.ceil((deadline - performance.now()) / 1000);
    timer.textContent = t.seconds(Math.max(left, 0));
    if (left <= 0) submit(); // time is up: submit whatever is typed
  }, 100);
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
}

function feedback(day, i, results) {
  const r = results[i];
  const last = i === day.questions.length - 1;
  show(
    el("p", { textContent: t.question(i + 1, day.questions.length) }),
    el("h2", { textContent: r.prompt }),
    el("p", { textContent: `${t.yourAnswer}: ${r.typed.trim() || "-"}` }),
    ...(r.name ? [el("p", { textContent: t.matchedAs(r.name) })] : []),
    el("p", { className: "points", textContent: t.points(r.pts) }),
    el("p", { textContent: r.rarity + (r.share ? `. ${t.shareOf(Math.round(r.share * 100))}` : "") }),
    el("p", { textContent: r.text }),
    el("button", { textContent: last ? t.finish : t.next, onclick: () => (last ? end(results) : ask(day, i + 1, results)) }),
  );
}

function end(results) {
  const total = results.reduce((s, r) => s + r.pts, 0);
  const rows = results.map((r) => el("tr", {},
    el("td", { textContent: r.prompt }),
    el("td", { textContent: r.typed.trim() || "-" }),
    el("td", { textContent: r.rarity }),
    el("td", { textContent: r.pts }),
  ));
  show(
    el("h1", { textContent: `${t.total}: ${total}` }),
    el("table", {},
      el("thead", {}, el("tr", {}, ...[t.questionCol, t.yourAnswer, t.rarityCol, t.pointsCol].map((h) => el("th", { textContent: h })))),
      el("tbody", {}, ...rows)),
    el("button", { textContent: t.playAgain, onclick: () => location.reload() }),
  );
}

loadDay().then(intro).catch(() => show(el("p", { textContent: t.loadError })));
