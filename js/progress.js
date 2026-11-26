// The player's days, kept in this browser only (localStorage): no account, no server. Clearing the browser data, or another device, starts fresh.
// days = { "2026-12-01": [{ prompt, typed, name, key, pts, rarity }, ...] }, one entry per day: the first game of a day counts.
const KEY = "historillion.days";
const KEYS = new Set(["common", "uncommon", "rare", "veryRare", "none"]);

// What is stored can be edited by anyone with the browser's dev tools, so only well-formed days are used.
const validDay = (v) => Array.isArray(v) && v.length > 0 && v.every((r) => r && typeof r.pts === "number" && Number.isFinite(r.pts) && KEYS.has(r.key));

export function loadDays(storage = globalThis.localStorage) {
  let raw = {};
  try { raw = JSON.parse(storage?.getItem(KEY) ?? "{}") ?? {}; } catch { return {}; }
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([date, v]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && validDay(v)));
}

export function saveDay(date, results, storage = globalThis.localStorage) {
  const days = loadDays(storage);
  if (days[date]) return days; // the first game of the day counts
  days[date] = results.map(({ prompt, typed, name, key, pts, rarity }) => ({ prompt, typed, name: name ?? null, key, pts, rarity }));
  try { storage?.setItem(KEY, JSON.stringify(days)); } catch { /* private mode or full: the game still works, it just forgets */ }
  return days;
}

const prevDate = (date) => new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
const dayTotal = (results) => results.reduce((s, r) => s + r.pts, 0);

// streak: days in a row up to today (or up to yesterday while today is not played yet, so the streak does not look broken in the morning)
export function stats(days, today) {
  const dates = Object.keys(days);
  let d = days[today] ? today : prevDate(today);
  let streak = 0;
  while (days[d]) { streak++; d = prevDate(d); }
  return {
    played: dates.length,
    best: dates.length ? Math.max(...dates.map((x) => dayTotal(days[x]))) : 0,
    streak,
    top: dates.reduce((n, x) => n + days[x].filter((r) => r.key === "veryRare").length, 0),
  };
}
