/**
 * Pearson correlation between two series of cell values, and the N×N
 * correlation matrix of several columns. Pure (no DOM, no sheet).
 * Pairs are kept only when both values are finite numbers (text, empty,
 * booleans and errors are skipped pair by pair). A constant series (zero
 * variance) or fewer than two complete pairs yields an explicit error,
 * never NaN.
 */
import type { ErrorCode, Value } from "../types";

/** Correlation of one pair of series: r in [-1, 1] and the number of pairs used. */
export interface CorrelationStats {
  r: number;
  count: number;
}

/** Failure: a series has zero variance or fewer than two complete pairs. */
export interface CorrelationError {
  error: ErrorCode;
  message: string;
}

/** Result of pearson. */
export type CorrelationResult = CorrelationStats | CorrelationError;

/** True when the result is an error rather than a coefficient. */
export function isCorrelationError(r: CorrelationResult): r is CorrelationError {
  return "error" in r;
}

/** Keeps the value only when it is a finite number. */
function asNumber(v: Value | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Pearson correlation of xs and ys, using only the pairs where both values
 * are numbers. Returns #DIV/0! when a series is constant or fewer than two
 * pairs remain.
 */
export function pearson(xs: Value[], ys: Value[]): CorrelationResult {
  const pairs: [number, number][] = [];
  const n = Math.min(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    const x = asNumber(xs[i]);
    const y = asNumber(ys[i]);
    if (x !== null && y !== null) pairs.push([x, y]);
  }
  if (pairs.length < 2) {
    return { error: "#DIV/0!", message: "Il faut au moins deux paires numériques" };
  }
  const k = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / k;
  const my = pairs.reduce((s, p) => s + p[1], 0) / k;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) {
    return { error: "#DIV/0!", message: "Une série a une variance nulle" };
  }
  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  return { r, count: k };
}

/**
 * N×N symmetric matrix of Pearson coefficients for the given columns.
 * Diagonal is 1 for a non-constant column; a cell is null when its pair
 * cannot be computed (zero variance or too few complete pairs).
 */
export function correlationMatrix(columns: Value[][]): (number | null)[][] {
  const n = columns.length;
  const m: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const r = pearson(columns[i], columns[j]);
      const value = isCorrelationError(r) ? null : r.r;
      m[i][j] = value;
      m[j][i] = value;
    }
  }
  return m;
}
