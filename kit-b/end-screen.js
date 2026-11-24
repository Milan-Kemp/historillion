// The end screen for Historillion (2D kit): the score curve, the rank list, the finds list and the next-dig countdown.
// Everything is built with createElement / createElementNS (no innerHTML), so player input can never become markup.
//
//   import { endCurve, rankList, findsList, nextDig, RANKS } from "../kit-b/end-screen.js";
//   import { scoreDistribution, bins, percentile } from "./distribution.js";
//   const dist = scoreDistribution(day);
//   show(
//     el("h1", { className: "total" }, el("span", { className: "sr", textContent: `${t.total}: ` }), String(total)),
//     el("p", { className: "sub", textContent: t.totalLabel }),
//     endCurve({ bins: bins(dist), total, percentile: percentile(dist, total), labels: t.curve }),
//     rankList({ total, ranks: t.ranks, title: t.ranksTitle }),
//     findsList({ results: results.map((r) => ({ prompt: r.prompt, typed: r.typed, rarity: r.rarity, find: DIG[r.key].find, findLabel: r.dig.find, pts: r.pts })), title: t.findsTitle, pointsLabel: t.pointsShort }),
//     nextDig({ label: t.nextDig }),
//     button(play again));
//
// IMPORTANT: the curve is an ESTIMATE from predicted answer shares, not real players. endCurve always prints that, in view of the curve (labels.estimate).

export const RANKS = [
  { from: 0, name: "Dust Sweeper", line: "Plenty of dirt left to dig through." },
  { from: 150, name: "Shard Finder", line: "Pottery everywhere. A start." },
  { from: 250, name: "Trowel Hand", line: "Steady digging. The pit approves." },
  { from: 350, name: "Site Supervisor", line: "Real finds, real sweat. Nice." },
  { from: 450, name: "Field Archaeologist", line: "The museum is calling." },
  { from: 550, name: "Lead Excavator", line: "Even the trucks listen to you." },
  { from: 640, name: "Legend of the Dig", line: "One in a million. Seriously." },
];

const CURVE_LABELS = {
  you: "YOU",
  better: (pct) => `Better than ${pct}% of players`,
  estimate: "Estimated, based on predicted answers",
  aria: (total, pct) => `Your score is ${total}, better than ${pct}% of players (estimated)`,
};

const NS = "http://www.w3.org/2000/svg";
const sprite = (name) => new URL(`./sprites/finds/${name}.png`, import.meta.url).href;

function el(tag, className, props = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.assign(node, props);
  return node;
}
function svg(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Smooth path through points (Catmull-Rom turned into cubic Béziers), so the bell curve has no corners.
function smooth(points) {
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// bins: [{ from, to, p }] over 0..max; total: the player's score; percentile: the share below the score (0..1). Returns <figure class="curve">.
export function endCurve({ bins, total, percentile, max = 700, labels = {} }) {
  const L = { ...CURVE_LABELS, ...labels };
  const W = 320, H = 150, X0 = 12, X1 = 308, BASE = 112, TOP = 22;
  const x = (score) => X0 + (Math.min(Math.max(score, 0), max) / max) * (X1 - X0);
  const peak = Math.max(...bins.map((b) => b.p), 1e-9);
  const y = (p) => BASE - (p / peak) * (BASE - TOP);
  const pts = bins.map((b) => [x((b.from + b.to) / 2), y(b.p)]);
  const pct = Math.round(percentile * 100);

  const fig = el("figure", "curve");
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": L.aria(total, pct), class: "curve-svg" });
  s.append(svg("path", { class: "curve-area", d: `${smooth(pts)} L${pts[pts.length - 1][0].toFixed(1)},${BASE} L${pts[0][0].toFixed(1)},${BASE} Z` }));
  s.append(svg("line", { class: "curve-base", x1: X0, y1: BASE, x2: X1, y2: BASE }));
  for (let v = 0; v <= max; v += 100) {                                                              // axis ticks every 100
    s.append(svg("line", { class: "curve-tick", x1: x(v), y1: BASE, x2: x(v), y2: BASE + 4 }));
    const label = svg("text", { class: "curve-axis", x: x(v), y: BASE + 15, "text-anchor": "middle" });
    label.textContent = String(v);
    s.append(label);
  }
  s.append(svg("path", { class: "curve-line", d: smooth(pts) }));
  const i = Math.min(Math.max(bins.findIndex((b) => total >= b.from && total < b.to), 0), bins.length - 1);   // the curve's height at the player's score
  const mx = x(total);
  const my = Math.min(y(bins[i].p), BASE - 4);
  s.append(svg("line", { class: "curve-you", x1: mx, y1: 14, x2: mx, y2: BASE }));
  s.append(svg("circle", { class: "curve-dot", cx: mx, cy: my, r: 3.5 }));
  const you = svg("text", { class: "curve-youtext", x: Math.min(Math.max(mx, 22), W - 22), y: 10, "text-anchor": "middle" });
  you.textContent = L.you;
  s.append(you);
  fig.append(s);
  const cap = el("figcaption");
  cap.append(el("p", "curve-better", { textContent: L.better(pct) }), el("p", "curve-estimate", { textContent: L.estimate }));
  fig.append(cap);
  return fig;
}

// ranks: [{ from, name, line }] ascending (default RANKS). The rank the score falls in is highlighted (aria-current).
export function rankList({ total, ranks = RANKS, title = "Your rank" }) {
  const sec = el("section", "ranks");
  sec.append(el("h3", "", { textContent: title }));
  const ol = el("ol");
  const current = ranks.reduce((acc, r, i) => (total >= r.from ? i : acc), 0);
  ranks.forEach((r, i) => {
    const next = ranks[i + 1];
    const li = el("li", i === current ? "now" : "");
    if (i === current) li.setAttribute("aria-current", "true");
    li.append(el("span", "range", { textContent: next ? `${r.from}-${next.from - 1}` : `${r.from}+` }), el("span", "rank-name", { textContent: r.name }), el("span", "rank-line", { textContent: r.line }));
    ol.append(li);
  });
  sec.append(ol);
  return sec;
}

// results: [{ prompt, typed, rarity, find, findLabel, pts }] (find = the sprite name: shard, coin, crown, statue, rock)
export function findsList({ results, title = "Your finds", pointsLabel = "pts" }) {
  const sec = el("section", "finds");
  sec.append(el("h3", "", { textContent: title }));
  const ol = el("ol");
  for (const r of results) {
    const li = el("li");
    const img = el("img", "find-img", { src: sprite(r.find), alt: "", decoding: "async" });
    const text = el("div", "find-text");
    text.append(el("small", "find-q", { textContent: r.prompt }), el("strong", "find-a", { textContent: r.typed.trim() || "-" }), el("span", "find-r", { textContent: `${r.findLabel} · ${r.rarity}` }));
    const pts = el("span", "find-pts");
    pts.append(el("b", "", { textContent: String(r.pts) }), document.createTextNode(` ${pointsLabel}`));
    li.append(img, text, pts);
    ol.append(li);
  }
  sec.append(ol);
  return sec;
}

// "Next dig in 13:40:20", counting down to the next UTC midnight (the same moment every player's day changes). Stops by itself when removed from the page.
export function nextDig({ label = "Next dig in" } = {}) {
  const p = el("p", "next-dig");
  const time = el("time");
  p.append(document.createTextNode(`${label} `), time);
  const tick = () => {
    const now = new Date();
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const s = Math.max(Math.floor((next - now.getTime()) / 1000), 0);
    time.textContent = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  };
  tick();
  const id = setInterval(() => { if (!p.isConnected) clearInterval(id); else tick(); }, 1000);
  return p;
}
