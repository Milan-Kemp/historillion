import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize, distance, match, suggest } from "../js/matching.js";
import { points, rarityKey } from "../js/scoring.js";

const day = JSON.parse(readFileSync(new URL("../data/days/2026-12-01.json", import.meta.url)));
const q = (n) => day.questions[n - 1];
const hit = (n, text) => match(text, q(n));

test("normalize: case, accents, punctuation, articles", () => {
  assert.equal(normalize("  The  Álvares!! "), "alvares");
  assert.equal(normalize("Ch'in"), "chin");
  assert.equal(normalize("Ming Dynasty", ["dynasty"]), "ming");
});

test("distance: a swapped pair of letters is one edit", () => {
  assert.equal(distance("nero", "nreo"), 1);
  assert.equal(distance("kitten", "sitting"), 3);
});

test("exact match on canonical and alias", () => {
  assert.equal(hit(1, "Nero").entry.canonical, "Nero");
  assert.equal(hit(3, "king tut").entry.canonical, "Tutankhamun");
  assert.equal(hit(2, "Belorussia").entry.canonical, "Belarus");
  assert.equal(hit(1, "the emperor nero").kind, "none"); // extra words: no guessing
});

test("a typo of a valid answer is not counted, but suggested", () => {
  const sg = (n, text) => suggest(text, q(n))?.canonical;
  assert.equal(hit(1, "Caligla").kind, "none");
  assert.equal(sg(1, "Caligla"), "Caligula");
  assert.equal(sg(1, "Nreo"), "Nero"); // swap
  assert.equal(sg(1, "Marcus Aurelious"), "Marcus Aurelius");
  assert.equal(sg(7, "Colombus"), "Christopher Columbus");
  assert.equal(sg(3, "Ramessess II"), "Ramesses II");
  assert.equal(sg(6, "Hna"), "Han");
  assert.equal(sg(1, "banana"), undefined);
});

test("a tie between two answers gives no suggestion", () => {
  assert.equal(suggest("Ning", q(6)), null); // 1 edit from both Ming and Qing
});

test("optional question-level stripping: 'Ming dynasty'", () => {
  assert.equal(hit(6, "Ming dynasty").entry.canonical, "Ming");
  assert.equal(hit(6, "the Tang Dynasty").entry.canonical, "Tang");
});

test("rejected answers are recognised, with explanation", () => {
  assert.equal(hit(1, "Julius Caesar").kind, "rejected");
  assert.equal(hit(4, "pearl harbour").kind, "rejected"); // typo still found
  assert.equal(hit(5, "Catherine").kind, "rejected"); // ambiguous first name
});

test("no match, empty input", () => {
  assert.equal(hit(1, "banana").kind, "none");
  assert.equal(hit(1, "   ").kind, "none");
  assert.equal(hit(1, "!!!").kind, "none");
});

test("scoring: halving the share adds 15 points, capped at 100", () => {
  assert.equal(points(0.5), 15);
  assert.equal(points(0.25), 30);
  assert.equal(points(0.1), 50);
  assert.equal(points(0.01), 100);
  assert.equal(points(0.001), 100);
  assert.ok(points(0.1) > points(0.2));
});

test("rarity labels", () => {
  assert.equal(rarityKey(0.4), "common");
  assert.equal(rarityKey(0.01), "veryRare");
});

test("data: 7 questions, shares valid, sources and explanation present", () => {
  assert.equal(day.questions.length, 7);
  for (const question of day.questions) {
    const sum = question.answers.reduce((s, a) => s + a.prior_share, 0);
    assert.ok(sum > 0 && sum <= 1, `${question.id} shares sum to ${sum}`);
    for (const a of question.answers) {
      assert.ok(a.prior_share > 0 && a.prior_share < 1, a.canonical);
      assert.ok(a.explanation && a.sources.length > 0, a.canonical);
    }
  }
});

test("data: no two entries in a question share a normalized form", () => {
  for (const question of day.questions) {
    const seen = new Map();
    for (const e of [...question.answers, ...question.rejected]) {
      for (const f of [e.canonical, ...e.aliases]) {
        const n = normalize(f, question.strip ?? []);
        assert.ok(!seen.has(n) || seen.get(n) === e, `${question.id}: "${f}" clashes with ${seen.get(n)?.canonical}`);
        seen.set(n, e);
      }
    }
  }
});

test("suggest: close miss gives a hint, far miss and ties do not", async () => {
  const { suggest } = await import("../js/matching.js");
  const q = JSON.parse(readFileSync(new URL("../data/days/2026-12-01.json", import.meta.url))).questions[0];
  assert.equal(match("Nerro", q).kind, "none"); // a typo never counts by itself
  assert.equal(suggest("Nerro", q)?.canonical, "Nero");
  assert.equal(suggest("Nerooo", q)?.canonical, "Nero"); // one edit beyond the limit: hint
  assert.equal(suggest("banana", q), null);
  assert.equal(suggest("", q), null);
});

test("score distribution: sums to 1, percentile grows with the score", async () => {
  const { scoreDistribution, percentile, bins } = await import("../js/distribution.js");
  const dist = scoreDistribution(day);
  assert.ok(Math.abs([...dist.values()].reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(percentile(dist, 0) < percentile(dist, 200));
  assert.ok(percentile(dist, 200) < percentile(dist, 700));
  assert.ok(Math.abs(bins(dist).reduce((s, b) => s + b.p, 0) - 1) < 1e-9);
});

test("bins: `to` is exclusive and every integer score lands in exactly one bin", async () => {
  const { scoreDistribution, bins } = await import("../js/distribution.js");
  const b = bins(scoreDistribution(day));
  for (const score of [0, 24, 25, 49, 349, 699, 700]) {
    assert.equal(b.filter((x) => score >= x.from && score < x.to).length, 1, `score ${score}`);
  }
});

test("answerList: rarity filter, search, order", async () => {
  const { answerList } = await import("../js/answers.js");
  const q1 = q(1), q6 = q(6);
  const all = answerList(q1);
  assert.equal(all.length, q1.answers.length + q1.rejected.length);
  assert.equal(all.at(-1).key, "rejected"); // not valid answers last
  assert.ok(all[0].entry.prior_share >= all[1].entry.prior_share); // most common first
  assert.ok(answerList(q1, { rarity: "rejected" }).every((i) => i.key === "rejected"));
  assert.ok(answerList(q1, { rarity: "rare" }).every((i) => i.key === "rare"));
  assert.deepEqual(answerList(q1, { query: "NERO" }).map((i) => i.entry.canonical), ["Nero"]);
  assert.equal(answerList(q1, { query: "octav" }).length, 1); // finds an alias
  assert.deepEqual(answerList(q6, { query: "ming dynasty" }).map((i) => i.entry.canonical), ["Ming"]); // strip words are ignored
  assert.equal(answerList(q1, { query: "zzz" }).length, 0);
});

test("progress: one game per day, streak, best, top answers, bad stored data is ignored", async () => {
  const { loadDays, saveDay, stats } = await import("../js/progress.js");
  const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
  const s = mem();
  const game = (pts, key = "common") => [{ prompt: "Q", typed: "a", name: "A", key, pts, rarity: "Common answer" }];
  saveDay("2026-12-01", game(100, "veryRare"), s);
  saveDay("2026-12-01", game(5), s); // a second game the same day does not count
  assert.equal(loadDays(s)["2026-12-01"][0].pts, 100);
  saveDay("2026-12-02", game(300), s);
  assert.deepEqual(stats(loadDays(s), "2026-12-02"), { played: 2, best: 300, streak: 2, top: 1 });
  assert.equal(stats(loadDays(s), "2026-12-03").streak, 2); // today not played yet: yesterday's streak still stands
  assert.equal(stats(loadDays(s), "2026-12-04").streak, 0); // a day missed: the streak is over
  assert.equal(stats({}, "2026-12-01").best, 0);
  const bad = mem();
  bad.setItem("historillion.days", JSON.stringify({ "2026-12-01": [{ pts: "lots", key: "common" }], nope: [], "2026-12-02": game(10, "hacked") }));
  assert.deepEqual(loadDays(bad), {});
  bad.setItem("historillion.days", "{not json");
  assert.deepEqual(loadDays(bad), {});
});
