import { points } from "./scoring.js";

// Expected distribution of a day's total score, built from the predicted answer shares (prior_share).
// Per question an answer is chosen with probability prior_share and scores points(share); the rest scores 0.
// shortcut: assumes independent questions and that shares are right; replace by real player data when it exists.
export function scoreDistribution(day) {
  let dist = new Map([[0, 1]]);
  for (const q of day.questions) {
    const outcomes = q.answers.map((a) => [points(a.prior_share), a.prior_share]);
    const rest = 1 - q.answers.reduce((s, a) => s + a.prior_share, 0);
    if (rest > 1e-9) outcomes.push([0, rest]);
    const next = new Map();
    for (const [score, p] of dist) {
      for (const [pts, pp] of outcomes) next.set(score + pts, (next.get(score + pts) ?? 0) + p * pp);
    }
    dist = next;
  }
  return dist; // Map: total score -> probability
}

// Share of players below this total; a tie counts half.
export function percentile(dist, total) {
  let below = 0;
  for (const [score, p] of dist) below += score < total ? p : score === total ? p / 2 : 0;
  return below;
}

// Histogram for drawing the curve: [{ from, to, p }], bins of `size` points from 0 to 700. `to` is exclusive (from <= score < to).
export function bins(dist, size = 25, max = 700) {
  const out = Array.from({ length: Math.ceil((max + 1) / size) }, (_, i) => ({ from: i * size, to: Math.min((i + 1) * size, max + 1), p: 0 }));
  for (const [score, p] of dist) out[Math.min(Math.floor(score / size), out.length - 1)].p += p;
  return out;
}
