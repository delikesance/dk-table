/** Pure fuzzy matching helpers for the command palette. */

/**
 * Scores `query` as a case-insensitive subsequence of `text`.
 * Returns null when it does not match; higher is better.
 * Bonuses: consecutive chars, word starts, prefix; small penalty for gaps.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  const t = text.toLowerCase();
  // Contiguous substring beats any scattered subsequence.
  const sub = t.indexOf(q);
  if (sub >= 0) {
    const ws = sub === 0 || /[\s\-_/.]/.test(t[sub - 1]);
    return 100 + (sub === 0 ? 10 : 0) + (ws ? 8 : 0) - sub * 0.1;
  }
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    const at = t.indexOf(ch, ti);
    if (at < 0) return null;
    const wordStart = at === 0 || /[\s\-_/.]/.test(t[at - 1]);
    if (at === prev + 1) score += 5; // consecutive
    if (wordStart) score += 8;
    if (at === 0) score += 4; // prefix
    score += 1 - Math.min(at - ti, 5) * 0.3; // gap penalty
    prev = at;
    ti = at + 1;
  }
  return score;
}

/**
 * Filters `items` by `query` and sorts by descending score (stable on ties).
 * An empty query returns a copy in original order.
 */
export function fuzzyFilter<T>(query: string, items: T[], text: (item: T) => string): T[] {
  if (!query.trim()) return [...items];
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const score = fuzzyScore(query, text(item));
    if (score !== null) scored.push({ item, score, i });
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.map((s) => s.item);
}
