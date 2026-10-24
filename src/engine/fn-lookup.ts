/**
 * Lookup functions: VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP.
 * Ranges arrive as `Value[]` (flat, width lost) or, for 2D-aware callers, as `Value[][]` (rows).
 * A flat array is treated as a single column. "Not found" is #N/A in Excel; the engine has no
 * such code, so #VALUE! is used.
 */
import { err, isErr, type Value } from "./types";
import { toBool, toNum } from "./values";
import type { Arg, Builtin } from "./functions";

type Matrix = Value[][];

/** Not-found error (no #N/A in ErrorCode). */
const NOT_FOUND = () => err("#VALUE!");

/** Normalize an arg to a matrix: nested arrays as-is, flat array = one column, scalar = 1x1. */
function toMatrix(a: Arg | undefined): Matrix {
  if (a === undefined) return [];
  if (!Array.isArray(a)) return [[a]];
  return (a as unknown[]).map((x) => (Array.isArray(x) ? (x as Value[]) : [x as Value]));
}

/** Compare two values: numbers numerically, text case-insensitively; null if types differ. */
function cmp(a: Value, b: Value): number | null {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return null;
}

/**
 * Find the index in `keys`. mode 0 exact; 1 last <= (ascending); -1 smallest >= (descending).
 * Returns -1 when not found.
 */
function findIndex(v: Value, keys: Value[], mode: 0 | 1 | -1): number {
  let best = -1;
  for (let i = 0; i < keys.length; i++) {
    const c = cmp(keys[i], v);
    if (c === null) continue;
    if (mode === 0 ? c === 0 : mode === 1 ? c <= 0 : c >= 0) {
      if (mode === 0) return i;
      best = i;
    } else if (mode !== 0 && best >= 0) break; // sorted: past the boundary
  }
  return best;
}

/** Read an integer arg (>=1 check done by caller); errors propagate. */
function intArg(a: Arg | undefined, dflt?: number): number | Value {
  if (a === undefined) return dflt ?? err("#VALUE!");
  if (Array.isArray(a)) return err("#VALUE!");
  const n = toNum(a);
  return isErr(n) ? n : Math.trunc(n);
}

/** Boolean "approximate" flag, default TRUE. */
function approxArg(a: Arg | undefined): boolean | Value {
  if (a === undefined || Array.isArray(a)) return a === undefined ? true : err("#VALUE!");
  return toBool(a);
}

/** Shared VLOOKUP/HLOOKUP body over a matrix whose search keys are its first row. */
function lookup(args: Arg[], horizontal: boolean): Value {
  const [v, t, i, ap] = args;
  if (Array.isArray(v)) return err("#VALUE!");
  if (isErr(v)) return v;
  const idx = intArg(i);
  if (typeof idx !== "number") return idx;
  const approx = approxArg(ap);
  if (typeof approx !== "boolean") return approx;
  if (idx < 1) return err("#VALUE!");
  const m = toMatrix(t);
  const grid = horizontal ? m : m[0] ? m[0].map((_, c) => m.map((row) => row[c])) : [];
  // grid[0] = search keys, grid[k] = k-th return line
  if (!grid.length) return err("#REF!");
  if (idx > grid.length) return err("#REF!");
  const pos = findIndex(v, grid[0], approx ? 1 : 0);
  if (pos < 0) return NOT_FOUND();
  return grid[idx - 1][pos] ?? "";
}

/** VLOOKUP(value, table, col[, approx=TRUE]): search first column, return column `col`. */
const vlookup: Builtin = (a) => lookup(a, false);

/** HLOOKUP(value, table, row[, approx=TRUE]): search first row, return row `row`. */
const hlookup: Builtin = (a) => lookup(a, true);

/** INDEX(range, row[, col]): 1-based element; flat range with one index = nth element. */
const index: Builtin = ([r, ri, ci]) => {
  const m = toMatrix(r);
  const row = intArg(ri);
  if (typeof row !== "number") return row;
  const col = intArg(ci, 1);
  if (typeof col !== "number") return col;
  if (row < 1 || col < 1 || row > m.length || col > (m[0]?.length ?? 0)) return err("#REF!");
  return m[row - 1][col - 1] ?? "";
};

/** MATCH(value, range[, type=1]): 1-based position; 0 exact, 1 last <=, -1 smallest >=. */
const match: Builtin = ([v, r, t]) => {
  if (Array.isArray(v)) return err("#VALUE!");
  if (isErr(v)) return v;
  const type = intArg(t, 1);
  if (typeof type !== "number") return type;
  const keys = toMatrix(r).flat();
  const pos = findIndex(v, keys, type === 0 ? 0 : type > 0 ? 1 : -1);
  return pos < 0 ? NOT_FOUND() : pos + 1;
};

/** XLOOKUP(value, lookup_range, return_range[, if_not_found]): exact match, same-length ranges. */
const xlookup: Builtin = ([v, l, r, d]) => {
  if (Array.isArray(v)) return err("#VALUE!");
  if (isErr(v)) return v;
  const keys = toMatrix(l).flat();
  const out = toMatrix(r).flat();
  if (keys.length !== out.length) return err("#VALUE!");
  const pos = findIndex(v, keys, 0);
  if (pos >= 0) return out[pos] ?? "";
  return d === undefined || Array.isArray(d) ? NOT_FOUND() : d;
};

/** Lookup builtins to merge into the engine registry (same format as the other function groups). */
export const lookupFunctions: Record<string, Builtin> = {
  VLOOKUP: vlookup,
  HLOOKUP: hlookup,
  INDEX: index,
  MATCH: match,
  XLOOKUP: xlookup,
};
