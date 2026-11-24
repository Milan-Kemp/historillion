const ARTICLES = new Set(["the", "a", "an"]);

// Lowercase, no accents, no punctuation, no articles. `strip` = extra words to drop (e.g. "dynasty").
export function normalize(text, strip = []) {
  return text
    .normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’`]/g, "") // "Ch'in" -> "chin", not "ch in"
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w && !ARTICLES.has(w) && !strip.includes(w))
    .join(" ");
}

// Optimal string alignment: Levenshtein plus swapping two neighbouring letters counts as 1 edit.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Short words must be exact ("han" must not become "tang"); longer words get more room.
export function threshold(length) {
  return length <= 3 ? 0 : length <= 8 ? 1 : 2;
}

// For a "none" result: the one valid answer that is one edit beyond the fuzzy limit, as a "did you mean" hint.
// shortcut: one extra edit only and no ties, so the hint cannot be used to fish for answers; tune after playtests.
export function suggest(input, question) {
  const strip = question.strip ?? [];
  const typed = normalize(input, strip);
  if (!typed) return null;
  let best = null;
  let tie = false;
  for (const entry of question.answers) {
    const d = Math.min(...[entry.canonical, ...entry.aliases].map((f) => {
      const n = normalize(f, strip);
      return distance(typed, n) <= threshold(n.length) + 1 ? distance(typed, n) : Infinity;
    }));
    if (d === Infinity) continue;
    if (!best || d < best.d) { best = { entry, d }; tie = false; }
    else if (d === best.d) tie = true;
  }
  return best && !tie ? best.entry : null;
}

// Returns { kind: "answer" | "rejected" | "none", entry, how: "exact" | "fuzzy" }.
export function match(input, question) {
  const strip = question.strip ?? [];
  const typed = normalize(input, strip);
  if (!typed) return { kind: "none" };

  const entries = [
    ...question.answers.map((entry) => ({ kind: "answer", entry })),
    ...question.rejected.map((entry) => ({ kind: "rejected", entry })),
  ].map((c) => ({
    ...c,
    forms: [c.entry.canonical, ...c.entry.aliases].map((f) => normalize(f, strip)),
  }));

  for (const kind of ["answer", "rejected"]) {
    const hit = entries.find((c) => c.kind === kind && c.forms.includes(typed));
    if (hit) return { kind, entry: hit.entry, how: "exact" };
  }

  let best = null;
  let tie = false;
  for (const c of entries) {
    const d = Math.min(...c.forms.map((f) => (distance(typed, f) <= threshold(f.length) ? distance(typed, f) : Infinity)));
    if (d === Infinity) continue;
    if (!best || d < best.d) { best = { ...c, d }; tie = false; }
    else if (d === best.d) tie = true;
  }
  // Two equally close answers: guessing would be unfair, so no match.
  if (!best || tie) return { kind: "none" };
  // A typo of a valid answer never counts by itself: suggest() offers "did you mean" and the player confirms.
  if (best.kind === "answer") return { kind: "none" };
  return { kind: best.kind, entry: best.entry, how: "fuzzy" };
}
