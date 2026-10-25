import type { Sheet } from "./types";
import { rectOf } from "./openrange";

/** Parse "B12" into 1-based {col,row}; null if malformed. No bounds check. */
export function parseKey(key: string): { col: number; row: number } | null {
  const m = /^([A-Za-z]{1,3})([1-9]\d*)$/.exec(key);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1].toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64;
  return { col, row: Number(m[2]) };
}

/** Build a key ("B12") from 1-based col/row. */
export function makeKey(col: number, row: number): string {
  let s = "";
  for (let c = col; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
  return s + row;
}

/** True when the key addresses a cell inside the sheet bounds. */
export function inBounds(sheet: Sheet, key: string): boolean {
  const p = parseKey(key);
  return !!p && p.col >= 1 && p.col <= sheet.cols && p.row >= 1 && p.row <= sheet.rows;
}

/** Normalize a key to upper case ("a1" -> "A1"). */
export function normKey(key: string): string {
  return key.toUpperCase();
}

/**
 * Expand "A1:B3" (or an open range such as "B2:B", "A:C", "2:5") to its cell keys (row-major).
 * `clip`: open sides stop at the used range, else they reach the sheet bounds.
 * Returns null when an endpoint is malformed or out of bounds.
 */
export function expandRange(sheet: Sheet, a: string, b: string, clip = false): string[] | null {
  const r = rectOf(sheet, a, b, clip);
  if (!r) return null;
  const out: string[] = [];
  for (let row = r.r1; row <= r.r2; row++)
    for (let c = r.c1; c <= r.c2; c++) out.push(makeKey(c, row));
  return out;
}
