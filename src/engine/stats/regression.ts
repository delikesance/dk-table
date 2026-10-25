/**
 * Simple linear regression (least squares) of y on x for two series of cell
 * values: slope, intercept and R². Pure (no DOM, no sheet).
 * Pairs are kept only when both values are finite numbers (text, empty,
 * booleans and errors are skipped pair by pair). Fewer than two complete
 * pairs, or a constant x series, yields an explicit error, never NaN.
 */
import type { ErrorCode, Value } from "../types";

/** Fit of y = slope * x + intercept, with the coefficient of determination. */
export interface RegressionStats {
  slope: number;
  intercept: number;
  r2: number;
  count: number;
}

/** Failure: fewer than two complete pairs, or x has zero variance. */
export interface RegressionError {
  error: ErrorCode;
  message: string;
}

/** Result of linearRegression. */
export type RegressionResult = RegressionStats | RegressionError;

/** True when the result is an error rather than a fit. */
export function isRegressionError(r: RegressionResult): r is RegressionError {
  return "error" in r;
}

/** Keeps the value only when it is a finite number. */
function asNumber(v: Value | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Least-squares line through the complete (x, y) pairs.
 * R² is 1 for aligned points; it is clamped to [0, 1] against rounding.
 * A constant y series gives a slope of 0 and R² of 1 (the line is exact).
 */
export function linearRegression(xs: Value[], ys: Value[]): RegressionResult {
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
  if (sxx === 0) {
    return { error: "#DIV/0!", message: "La série x est constante : pente indéfinie" };
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 1 : Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy)));
  return { slope, intercept, r2, count: k };
}
