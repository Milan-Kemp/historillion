export const FACTOR = 15;
export const MAX_POINTS = 100;

// points = 15 * log2(1 / share), capped at 100. Every halving of the share adds 15 points.
// 50% -> 15, 25% -> 30, 10% -> 50, 1% -> 100 (cap).
export function points(share) {
  if (share <= 0) return MAX_POINTS;
  return Math.min(MAX_POINTS, Math.round(FACTOR * Math.log2(1 / share)));
}

export function rarityKey(share) {
  if (share >= 0.15) return "common";
  if (share >= 0.05) return "uncommon";
  if (share >= 0.02) return "rare";
  return "veryRare";
}
