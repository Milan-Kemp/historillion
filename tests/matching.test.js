import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize, distance, match } from "../js/matching.js";
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

test("fuzzy match fixes typos, grows with word length", () => {
  assert.equal(hit(1, "Caligla").entry.canonical, "Caligula"); // 1 missing letter
  assert.equal(hit(1, "Marcus Aurelious").entry.canonical, "Marcus Aurelius");
  assert.equal(hit(7, "Colombus").entry.canonical, "Christopher Columbus");
  assert.equal(hit(3, "Ramessess II").entry.canonical, "Ramesses II");
  assert.equal(hit(1, "Nreo").entry.canonical, "Nero"); // swap, 1 edit
});

test("short words must be exact", () => {
  assert.equal(hit(6, "Hna").kind, "none"); // would be 2 edits from Han, and Han is short
  assert.equal(hit(6, "Han").entry.canonical, "Han");
});

test("a tie between two answers is no match", () => {
  assert.equal(hit(6, "Ning").kind, "none"); // 1 edit from both Ming and Qing
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
