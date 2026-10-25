/**
 * Structural edits on raw cells: insert/delete rows or columns, moving cells and
 * rewriting every formula reference (Excel behaviour: `$` refs move too, refs to
 * deleted cells become `#REF!`, ranges shrink on delete and grow on insert inside).
 * Pure: inputs are not mutated. Self-contained tokenizer (does not depend on parser.ts).
 */
import { makeKey, parseKey } from "./address";
import { OPEN_RANGE_SRC } from "./openrange";

/** One structural edit: `n > 0` inserts n lines before `at`; `n < 0` deletes |n| lines from `at` (1-based). */
export interface StructEdit {
  axis: "row" | "col";
  at: number;
  n: number;
}

/** New position of a line index, or null when it is deleted. */
function moveLine(v: number, e: StructEdit): number | null {
  if (v < e.at) return v;
  if (e.n > 0) return v + e.n;
  const end = e.at - e.n - 1;
  return v > end ? v + e.n : null;
}

/** New key of a cell, or null when its row/column is deleted. */
function moveKey(key: string, e: StructEdit): string | null {
  const p = parseKey(key);
  if (!p) return key;
  if (e.axis === "row") {
    const r = moveLine(p.row, e);
    return r === null ? null : makeKey(p.col, r);
  }
  const c = moveLine(p.col, e);
  return c === null ? null : makeKey(c, p.row);
}

/** Parsed reference with its `$` markers; `col`/`row` are 0 for the absent part of an open-range endpoint. */
interface Ref { col: number; row: number; ac: boolean; ar: boolean }

const REF = /^(\$?)([A-Za-z]{1,3})?(\$?)(\d+)?$/;

/** Parse "$A$1" / "a1" (or the endpoint "B" / "$3" of an open range) into a Ref. */
function parseRef(s: string): Ref {
  const m = REF.exec(s)!;
  const col = m[2] ? parseKey(m[2] + "1")!.col : 0;
  return { col, row: m[4] ? Number(m[4]) : 0, ac: !!m[2] && !!m[1], ar: m[2] ? !!m[3] : !!(m[1] || m[3]) };
}

/** Format a Ref back to text, keeping `$` markers. */
function fmtRef(r: Ref): string {
  const letters = r.col ? makeKey(r.col, 1).slice(0, -1) : "";
  return `${r.ac ? "$" : ""}${letters}${r.ar ? "$" : ""}${r.row || ""}`;
}

/** Shift a single reference; null when its cell is deleted. */
function shiftRef(r: Ref, e: StructEdit): Ref | null {
  const prop = e.axis === "row" ? "row" : "col";
  const v = moveLine(r[prop], e);
  return v === null ? null : { ...r, [prop]: v };
}

/** Shift a range: endpoints in deleted lines snap inward; null when the whole range is deleted. */
function shiftRange(a: Ref, b: Ref, e: StructEdit): [Ref, Ref] | null {
  const prop = e.axis === "row" ? "row" : "col";
  const [lo, hi] = a[prop] <= b[prop] ? [a, b] : [b, a];
  let nlo = moveLine(lo[prop], e);
  let nhi = moveLine(hi[prop], e);
  if (nlo === null) nlo = e.at; // first surviving line after the deletion
  if (nhi === null) nhi = e.at - 1; // last surviving line before the deletion
  if (nlo > nhi) return null;
  const rlo = { ...lo, [prop]: nlo }, rhi = { ...hi, [prop]: nhi };
  return lo === a ? [rlo, rhi] : [rhi, rlo];
}

/** Shift an open range (`B2:B`, `A:C`, `2:5`): an axis the range does not constrain is unchanged. */
function shiftOpen(a: Ref, b: Ref, e: StructEdit): [Ref, Ref] | null {
  const prop = e.axis === "row" ? "row" : "col";
  if (!a[prop] && !b[prop]) return [a, b];
  if (!b[prop]) return [{ ...a, [prop]: moveLine(a[prop], e) ?? e.at }, b];
  return shiftRange(a, b, e);
}

/**
 * Open range, ref or range, not preceded by an identifier char (so sheet-qualified refs are left alone)
 * and not followed by one or by "(" (function names). One pass: groups 2 = open range, 3/4 = ref / range end.
 */
const TOKEN = new RegExp(
  "(^|[^A-Za-z0-9_.$!#])(?:(" + OPEN_RANGE_SRC + ")|(\\$?[A-Za-z]{1,3}\\$?\\d+)(?::(\\$?[A-Za-z]{1,3}\\$?\\d+))?(?![A-Za-z0-9_.($]))",
  "g",
);

/** Rewrite refs in a formula fragment that contains no string literal. */
function rewriteCode(code: string, e: StructEdit): string {
  return code.replace(TOKEN, (_m, pre: string, open?: string, a?: string, b?: string) => {
    if (open !== undefined) {
      const [x, y] = open.split(":");
      const rg = shiftOpen(parseRef(x), parseRef(y), e);
      return pre + (rg ? `${fmtRef(rg[0])}:${fmtRef(rg[1])}` : "#REF!");
    }
    if (b === undefined) {
      const r = shiftRef(parseRef(a!), e);
      return pre + (r ? fmtRef(r) : "#REF!");
    }
    const rg = shiftRange(parseRef(a!), parseRef(b), e);
    return pre + (rg ? `${fmtRef(rg[0])}:${fmtRef(rg[1])}` : "#REF!");
  });
}

/** Rewrite every reference of a raw cell for the edit; non-formulas are returned unchanged. */
export function rewriteFormula(raw: string, e: StructEdit): string {
  if (!raw.startsWith("=")) return raw;
  // split on string literals ("" escapes stay inside a literal): odd parts are strings
  const parts = raw.split(/("(?:[^"]|"")*"?)/);
  return parts.map((p, i) => (i % 2 ? p : rewriteCode(p, e))).join("");
}

/** Move the keys of any per-cell map (styles...); entries of deleted cells are dropped. */
export function moveKeys<T>(map: Record<string, T>, e: StructEdit): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(map)) {
    const nk = moveKey(k, e);
    if (nk !== null) out[nk] = v;
  }
  return out;
}

/** Apply a structural edit to raw cells: move cells and rewrite all formulas. */
export function applyEdit(cells: Record<string, string>, e: StructEdit): Record<string, string> {
  const moved = moveKeys(cells, e);
  for (const k of Object.keys(moved)) moved[k] = rewriteFormula(moved[k], e);
  return moved;
}

/** Insert `n` rows before row `at` (1-based). */
export const insertRows = (cells: Record<string, string>, at: number, n: number) =>
  applyEdit(cells, { axis: "row", at, n });
/** Delete `n` rows starting at row `at` (1-based). */
export const deleteRows = (cells: Record<string, string>, at: number, n: number) =>
  applyEdit(cells, { axis: "row", at, n: -n });
/** Insert `n` columns before column `at` (1-based). */
export const insertCols = (cells: Record<string, string>, at: number, n: number) =>
  applyEdit(cells, { axis: "col", at, n });
/** Delete `n` columns starting at column `at` (1-based). */
export const deleteCols = (cells: Record<string, string>, at: number, n: number) =>
  applyEdit(cells, { axis: "col", at, n: -n });
