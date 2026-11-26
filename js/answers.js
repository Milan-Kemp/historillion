import { normalize } from "./matching.js";
import { points, rarityKey } from "./scoring.js";

// Every possible answer of one question, filtered by rarity ("all" | common | uncommon | rare | veryRare | rejected) and by a search text.
// Valid answers come first, most common first; answers that do not count (rejected) come last.
export function answerList(question, { rarity = "all", query = "" } = {}) {
  const strip = question.strip ?? [];
  const q = normalize(query, strip);
  const items = [
    ...question.answers.map((entry) => ({ entry, key: rarityKey(entry.prior_share), pts: points(entry.prior_share) })),
    ...question.rejected.map((entry) => ({ entry, key: "rejected", pts: 0 })),
  ];
  return items
    .filter((it) => rarity === "all" || it.key === rarity)
    .filter((it) => !q || [it.entry.canonical, ...it.entry.aliases].some((f) => normalize(f, strip).includes(q)))
    .sort((a, b) => (a.key === "rejected") - (b.key === "rejected") || (b.entry.prior_share ?? 0) - (a.entry.prior_share ?? 0));
}

const FILTERS = ["all", "common", "uncommon", "rare", "veryRare", "rejected"];
const el = (tag, className, props = {}) => Object.assign(document.createElement(tag), className ? { className } : {}, props);

// The panel inside one result row: rarity filters, a search box, and every possible answer, each of which opens for its explanation and sources.
function answerPanel(question, mine, t) {
  let rarity = "all", query = "";
  const filters = el("div", "answer-filters", { role: "group" });
  filters.setAttribute("aria-label", t.answersFilter);
  const search = el("input", "answer-search", { type: "search", placeholder: t.answersSearch, autocomplete: "off", spellcheck: false });
  search.setAttribute("aria-label", t.answersSearch);
  const status = el("p", "answer-status", { role: "status" });
  const list = el("ul", "answer-list");
  const panel = el("div", "result-more", { hidden: true });
  panel.append(filters, search, status, list);

  function renderRow({ entry, key, pts }) {
    const isMine = mine === entry.canonical;
    const li = el("li", `answer-item ${key}${isMine ? " mine" : ""}`);
    const row = el("button", "answer-row", { type: "button" });
    row.setAttribute("aria-expanded", "false");
    row.append(
      el("span", "answer-name", { textContent: entry.canonical }),
      ...(isMine ? [el("span", "answer-you", { textContent: t.answersYours })] : []),
      el("span", "answer-rarity", { textContent: key === "rejected" ? t.rejected : t.rarity[key] }),
      el("span", "answer-pts", { textContent: key === "rejected" ? "0" : (t.plus ?? ((n) => `+${n}`))(pts) }),
    );
    const more = el("div", "answer-more", { hidden: true });
    more.append(el("p", "", { textContent: entry.explanation }));
    if (key !== "rejected") more.append(el("p", "answer-share", { textContent: t.shareOf(Math.round(entry.prior_share * 100)) }));
    (entry.sources ?? []).filter((u) => /^https?:\/\//.test(u)) // source links must be http(s)
      .forEach((u, n) => more.append(el("a", "answer-source", { href: u, target: "_blank", rel: "noopener noreferrer", textContent: t.sourceN(n + 1) })));
    row.onclick = () => {
      const open = more.hidden;
      more.hidden = !open;
      row.setAttribute("aria-expanded", String(open));
    };
    li.append(row, more);
    return li;
  }
  function renderList() {
    const items = answerList(question, { rarity, query });
    list.replaceChildren(...items.map(renderRow));
    status.textContent = items.length ? "" : t.answersNone;
  }
  function renderFilters() {
    filters.replaceChildren(...FILTERS.map((f) => {
      const b = el("button", "chip", { type: "button" });
      b.append(`${t.filters[f]} `, el("small", "count",{ textContent: String(answerList(question, { rarity: f }).length) }));
      b.setAttribute("aria-pressed", String(f === rarity));
      b.onclick = () => { rarity = f; renderFilters(); renderList(); };
      return b;
    }));
  }
  search.addEventListener("input", () => { query = search.value; renderList(); });
  renderFilters();
  renderList();
  return panel;
}

// The results of the day, one row per question. Each row opens (from the first one on) into every possible answer of that question,
// with rarity filters and a search box. Built with createElement and textContent only (no innerHTML).
// spriteUrl(findName) gives the image of a find.
export function resultsList({ day, results, t, spriteUrl }) {
  const root = el("section", "results");
  const ol = el("ol", "result-list");
  results.forEach((r, i) => {
    const li = el("li", "result");
    const row = el("button", "result-row", { type: "button" });
    row.setAttribute("aria-expanded", "false");
    const text = el("span", "result-text");
    text.append(
      el("small", "result-q", { textContent: r.prompt }),
      el("strong", "result-a", { textContent: r.typed.trim() || "-" }),
      el("span", "result-r", { textContent: `${r.findLabel} · ${r.rarity}` }),
    );
    const pts = el("span", "result-pts");
    pts.append(el("b", "", { textContent: String(r.pts) }), document.createTextNode(` ${t.pointsShort}`));
    row.append(el("img", "find-img", { src: spriteUrl(r.find), alt: "", decoding: "async" }), text, pts, el("span", "result-caret"));
    const panel = answerPanel(day.questions[i], r.name, t);
    row.onclick = () => {
      const open = panel.hidden;
      panel.hidden = !open;
      row.setAttribute("aria-expanded", String(open));
    };
    li.append(row, panel);
    ol.append(li);
  });
  root.append(el("h3", "", { textContent: t.findsTitle }), el("p", "results-hint", { textContent: t.findsHint }), ol);
  return root;
}
