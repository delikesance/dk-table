/**
 * Descriptive statistics over a list of cell values: count, sum, mean, median,
 * mode, sample variance, sample standard deviation (n-1), min, max, range.
 * Pure (no DOM, no sheet): empty, text and boolean values are ignored;
 * a cell error propagates. Used by the statistics commands.
 */
import { isErr, type CellError, type ErrorCode, type Value } from "../types";
import { variance } from "../fn-stats";

/** Indicators computed from the numeric values. variance/stdev/mode are null when undefined. */
export interface DescriptiveStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number | null;
  variance: number | null;
  stdev: number | null;
  min: number;
  max: number;
  range: number;
}

/** Failure: a cell error (propagated) or no numeric value at all, with a readable message. */
export interface DescriptiveError {
  error: ErrorCode;
  message: string;
}

/** Result of describeValues. */
export type DescriptiveResult = DescriptiveStats | DescriptiveError;

/** True when the result is an error rather than statistics. */
export function isDescriptiveError(r: DescriptiveResult | CellError): r is DescriptiveError {
  return "error" in r;
}

/** Median of a sorted-or-not list (mean of the two middle values when even). */
function median(n: number[]): number {
  const s = [...n].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Most frequent value; first one reaching the top count wins; no repeat -> null. */
function mode(n: number[]): number | null {
  const count = new Map<number, number>();
  for (const x of n) count.set(x, (count.get(x) ?? 0) + 1);
  const top = Math.max(...count.values());
  if (top < 2) return null;
  for (const x of n) if (count.get(x) === top) return x;
  return null;
}

/** Statistics of `values`; errors propagate, non-numeric values are skipped, none numeric -> #VALUE!. */
export function describeValues(values: readonly Value[]): DescriptiveResult {
  const nums: number[] = [];
  for (const v of values) {
    if (isErr(v)) return { error: v.error, message: "Erreur dans la plage" };
    if (typeof v === "number") nums.push(v);
  }
  if (nums.length === 0) {
    return { error: "#VALUE!", message: "Aucune valeur numérique dans la plage" };
  }
  const sum = nums.reduce((a, b) => a + b, 0);
  const v = variance(nums);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  // variance() returns #DIV/0! for a single value: exposed as null.
  const varN = typeof v === "number" ? v : null;
  return {
    count: nums.length,
    sum,
    mean: sum / nums.length,
    median: median(nums),
    mode: mode(nums),
    variance: varN,
    stdev: varN === null ? null : Math.sqrt(varN),
    min,
    max,
    range: max - min,
  };
}
