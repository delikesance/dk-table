/**
 * Open-ended ranges (Sheets/Excel): `B2:B` (B2 to the last row), `B:B` / `A:C` (whole columns),
 * `2:5` (whole rows). An endpoint is a cell ("B2"), a column ("B") or a row ("2"); `$` is ignored here.
 * Evaluation clips the open side to the used range (cells with content); dependencies use the whole sheet.
 * Self-contained (no import from address.ts, which depends on it).
 */
import type { Sheet } from "./types";

/** Normalized 1-based inclusive rectangle. */
export interface Rect { c1: number; r1: number; c2: number; r2: number }

/** Endpoint: `col`/`row` are null when the endpoint does not constrain that axis. */
interface End { col: number | null; row: number | null }

/** Regex source of an open range (no anchors): half-open `B2:B`, columns `A:C`, rows `2:5`. */
export const OPEN_RANGE_SRC =
  "\\$?[A-Za-z]{1,3}\\$?\\d+:\\$?[A-Za-z]{1,3}(?![A-Za-z0-9_.($])" +
  "|\\$?[A-Za-z]{1,3}:\\$?[A-Za-z]{1,3}(?![A-Za-z0-9_.($])" +
  "|\\$?\\d+:\\$?\\d+(?![A-Za-z0-9_.($])";

/** Letters to column number ("AA" -> 27). */
function colNum(letters: string): number {
  let c = 0;
  for (const ch of letters.toUpperCase()) c = c * 26 + ch.charCodeAt(0) - 64;
  return c;
}

/** Parse "B2" | "B" | "2" (`$` ignored); null when malformed. */
function parseEnd(s: string): End | null {
  const m = /^([A-Za-z]{1,3})?([1-9]\d*)?$/.exec(s.replace(/\$/g, ""));
  if (!m || (!m[1] && !m[2])) return null;
  return { col: m[1] ? colNum(m[1]) : null, row: m[2] ? Number(m[2]) : null };
}

/** Bounds of a range per axis: `[lo, hi]`, hi = Infinity when open; null when the form is invalid. */
function span(a: End, b: End): { cols: [number, number] | null; rows: [number, number] | null } | null {
  const bothCol = a.col !== null && b.col !== null;
  if (!bothCol && (a.col !== null || b.col !== null)) return null;
  let rows: [number, number] | null = null;
  if (a.row !== null && b.row !== null) rows = [Math.min(a.row, b.row), Math.max(a.row, b.row)];
  else if (a.row !== null && b.col !== null) rows = [a.row, Infinity];
  else if (a.row !== null || b.row !== null) return null;
  if (!bothCol && !rows) return null;
  const cols: [number, number] | null = bothCol ? [Math.min(a.col!, b.col!), Math.max(a.col!, b.col!)] : null;
  return { cols, rows };
}

/** Highest used row among columns c1..c2, or highest used column among rows r1..r2 (0 if none). */
function used(sheet: Sheet, axis: "row" | "col", lo: number, hi: number): number {
  let best = 0;
  for (const [k, cell] of Object.entries(sheet.cells)) {
    if (cell.raw === "") continue;
    const m = /^([A-Za-z]+)(\d+)$/.exec(k)!;
    const c = colNum(m[1]), r = Number(m[2]);
    if (axis === "row" ? c >= lo && c <= hi && r > best : r >= lo && r <= hi && c > best) best = axis === "row" ? r : c;
  }
  return best;
}

/**
 * Rectangle of `a:b` on `sheet`. `clip`: open sides stop at the used range (at least the start line);
 * otherwise they extend to the sheet bounds. Null when malformed or outside the sheet.
 */
export function rectOf(sheet: Sheet, a: string, b: string, clip: boolean): Rect | null {
  const ea = parseEnd(a), eb = parseEnd(b);
  if (!ea || !eb) return null;
  const sp = span(ea, eb);
  if (!sp) return null;
  const [c1, c2] = sp.cols ?? [1, sheet.cols];
  let [r1, r2] = sp.rows ?? [1, sheet.rows];
  if (c1 < 1 || c2 > sheet.cols || r1 < 1 || r1 > sheet.rows || (r2 !== Infinity && r2 > sheet.rows)) return null;
  if (r2 === Infinity) r2 = sheet.rows;
  if (clip && (sp.rows === null || sp.rows[1] === Infinity)) r2 = Math.min(r2, Math.max(r1, used(sheet, "row", c1, c2)));
  if (clip && sp.cols === null) return { c1, r1, c2: Math.min(c2, Math.max(1, used(sheet, "col", r1, r2))), r2 };
  return { c1, r1, c2, r2 };
}

/** True when the cell `key` lies in `a:b` (open sides extend without limit; no sheet needed). */
export function containsKey(a: string, b: string, key: string): boolean {
  const ea = parseEnd(a), eb = parseEnd(b), p = parseEnd(key);
  const sp = ea && eb && p && p.col !== null && p.row !== null ? span(ea, eb) : null;
  if (!sp || !p) return false;
  return (!sp.cols || (p.col! >= sp.cols[0] && p.col! <= sp.cols[1]))
    && (!sp.rows || (p.row! >= sp.rows[0] && p.row! <= sp.rows[1]));
}
