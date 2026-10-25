/**
 * Outline (plan) model of the rows of a sheet, pure (no DOM).
 * Each row has a level from 0 (never hidden) to MAX_LEVEL (deepest detail). A group is the run of
 * rows directly above a summary row whose level is strictly higher; collapsing the summary hides
 * that run. The state is a list of folds (summary row + depth, like Excel: the group of depth d is
 * the run of rows of level >= d above the summary), so expanding one group keeps the sub-groups
 * that were collapsed on their own. Rows are 0-based indexes.
 * Limit: a group needs a summary row below it (a run at the end of the sheet cannot be folded).
 */

/** Deepest outline level (levels 0 to MAX_LEVEL). */
export const MAX_LEVEL = 8;

/** A collapsed group: its summary row and depth (rows of level >= depth above it are hidden). */
export interface Fold {
  row: number;
  depth: number;
}

/** Level of each row (`levels[i]` = row i) and the folds (collapsed groups). */
export interface Outline {
  levels: number[];
  collapsed: Fold[];
}

/** Check that a level is an integer from 0 to MAX_LEVEL, else throw RangeError. */
function checkLevel(level: number): void {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new RangeError(`niveau ${level} hors de 0-${MAX_LEVEL}`);
  }
}

/** Outline of `rows` rows, all at level 0 and expanded. */
export function emptyOutline(rows: number): Outline {
  return { levels: new Array<number>(rows).fill(0), collapsed: [] };
}

/** New outline with `row` at `level`. Throws RangeError on a bad level or row. */
export function setLevel(o: Outline, row: number, level: number): Outline {
  checkLevel(level);
  if (!Number.isInteger(row) || row < 0 || row >= o.levels.length) throw new RangeError(`ligne ${row} absente`);
  const levels = o.levels.slice();
  levels[row] = level;
  return { levels, collapsed: o.collapsed };
}

/** First row of the group of `summary` at `depth` (default: summary level + 1): walks up while level >= depth. */
export function groupStart(o: Outline, summary: number, depth = o.levels[summary] + 1): number {
  let r = summary;
  while (r > 0 && o.levels[r - 1] >= depth) r--;
  return r;
}

/** Set of rows hidden by the collapsed summaries. */
export function hiddenRows(o: Outline): Set<number> {
  const hidden = new Set<number>();
  for (const f of o.collapsed) {
    for (let r = groupStart(o, f.row, f.depth); r < f.row; r++) hidden.add(r);
  }
  return hidden;
}

/** Collapse the group of `summary`. No-op when the summary has no detail rows above it. */
export function collapse(o: Outline, summary: number): Outline {
  const depth = o.levels[summary] + 1;
  if (groupStart(o, summary) === summary || o.collapsed.some((f) => f.row === summary && f.depth === depth)) return o;
  return { levels: o.levels, collapsed: [...o.collapsed, { row: summary, depth }] };
}

/** Expand the group of `summary` (every fold on that row). Sub-groups collapsed on their own stay collapsed. */
export function expand(o: Outline, summary: number): Outline {
  return { levels: o.levels, collapsed: o.collapsed.filter((f) => f.row !== summary) };
}

/**
 * Show levels 0 to `n`: rows deeper than `n` are hidden, the others stay visible.
 * Replaces the collapsed state with one fold of depth n+1 per run of rows deeper than `n`.
 */
export function showLevel(o: Outline, n: number): Outline {
  checkLevel(n);
  const collapsed: Fold[] = [];
  o.levels.forEach((level, s) => {
    if (s > 0 && level <= n && o.levels[s - 1] > n) collapsed.push({ row: s, depth: n + 1 });
  });
  return { levels: o.levels, collapsed };
}
