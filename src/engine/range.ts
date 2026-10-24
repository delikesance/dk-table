/** Range utilities: parse "A1:B3" into numeric bounds and slice value grids. Reuses address.ts. */
import { makeKey, parseKey } from "./address";

/** Normalized 1-based inclusive range (c1<=c2, r1<=r2). */
export interface Range {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}

/** Optional sheet limits used to reject out-of-bounds ranges. */
export interface Bounds {
  cols: number;
  rows: number;
}

/** Column number (1-based) to letters: 1 -> "A", 27 -> "AA". */
export function colToLetters(col: number): string {
  return makeKey(col, 0).slice(0, -1);
}

/** Letters to 1-based column number ("AA" -> 27); null if not 1-3 letters. */
export function lettersToCol(letters: string): number | null {
  const p = parseKey(`${letters}1`);
  return p && /^[A-Za-z]+$/.test(letters) ? p.col : null;
}

/**
 * Parse "A1:B3", "$A$1:$B$3" or a single cell "C4" (case-insensitive, `$` ignored).
 * Reversed ranges are normalized. Returns null if malformed or outside `bounds` (when given).
 */
export function parseRange(text: string, bounds?: Bounds): Range | null {
  const parts = text.replace(/\$/g, "").split(":");
  if (parts.length > 2) return null;
  const a = parseKey(parts[0]);
  const b = parts.length === 2 ? parseKey(parts[1]) : a;
  if (!a || !b) return null;
  const r: Range = {
    c1: Math.min(a.col, b.col),
    r1: Math.min(a.row, b.row),
    c2: Math.max(a.col, b.col),
    r2: Math.max(a.row, b.row),
  };
  if (bounds && (r.c2 > bounds.cols || r.r2 > bounds.rows)) return null;
  return r;
}

/** Number of rows and columns covered by a range. */
export function rangeSize(r: Range): { rows: number; cols: number } {
  return { rows: r.r2 - r.r1 + 1, cols: r.c2 - r.c1 + 1 };
}

/**
 * Build a row-major 2D array of the range's values.
 * `values` is a lookup function or a record keyed by "A1"; missing cells give "".
 */
export function rangeToMatrix<T>(
  values: ((key: string) => T) | Record<string, T>,
  r: Range,
): (T | "")[][] {
  const get = typeof values === "function" ? values : (k: string) => values[k] ?? "";
  const out: (T | "")[][] = [];
  for (let row = r.r1; row <= r.r2; row++) {
    const line: (T | "")[] = [];
    for (let col = r.c1; col <= r.c2; col++) line.push(get(makeKey(col, row)));
    out.push(line);
  }
  return out;
}
