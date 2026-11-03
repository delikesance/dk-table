/** Merged cells (pure): ranges "B2:D3" stored per sheet; the top-left cell is the anchor, the others are absorbed. */
import { keyOf, parseKey, type Pos } from "./keys";
import { shiftRange } from "../../engine/cf/structure";
import type { StructEdit } from "../../engine/structure";

/** Inclusive 0-based rectangle. */
export interface Rect { c0: number; r0: number; c1: number; r1: number }

/** Rectangle spanned by two corners. */
export const rectOf = (a: Pos, b: Pos): Rect => ({
  c0: Math.min(a.col, b.col), r0: Math.min(a.row, b.row), c1: Math.max(a.col, b.col), r1: Math.max(a.row, b.row),
});

/** "B2:D3" -> rectangle (a single key gives a 1x1 rectangle). */
export function parseRect(s: string): Rect {
  const [a, b = a] = s.split(":");
  return rectOf(parseKey(a), parseKey(b));
}

/** Rectangle -> "B2:D3". */
export const fmtRect = (r: Rect): string => `${keyOf(r.c0, r.r0)}:${keyOf(r.c1, r.r1)}`;

/** True when the rectangle holds more than one cell. */
export const isMulti = (r: Rect): boolean => r.c1 > r.c0 || r.r1 > r.r0;

const overlap = (a: Rect, b: Rect): boolean => a.c0 <= b.c1 && b.c0 <= a.c1 && a.r0 <= b.r1 && b.r0 <= a.r1;

/** Merge covering the cell, if any. */
export function mergeAt(merges: readonly Rect[], col: number, row: number): Rect | undefined {
  return merges.find((m) => col >= m.c0 && col <= m.c1 && row >= m.r0 && row <= m.r1);
}

/** True when the cell is covered by a merge but is not its top-left anchor. */
export function absorbed(merges: readonly Rect[], col: number, row: number): boolean {
  const m = mergeAt(merges, col, row);
  return !!m && (m.c0 !== col || m.r0 !== row);
}

/** Merges after merging `r`: overlapping merges are dissolved; nothing changes for a single cell. */
export function addMerge(merges: readonly string[], r: Rect): string[] {
  if (!isMulti(r)) return [...merges];
  return [...merges.filter((s) => !overlap(parseRect(s), r)), fmtRect(r)];
}

/** Merges left after unmerging every merge that touches `r`. */
export function removeMerges(merges: readonly string[], r: Rect): string[] {
  return merges.filter((s) => !overlap(parseRect(s), r));
}

/** Keys absorbed (all cells of `r` except its top-left). */
export function absorbedKeys(r: Rect): string[] {
  const out: string[] = [];
  for (let row = r.r0; row <= r.r1; row++) for (let col = r.c0; col <= r.c1; col++) if (col !== r.c0 || row !== r.r0) out.push(keyOf(col, row));
  return out;
}

/** Cursor after an arrow move from `prev` landing on `to`: leaves the merge in the move direction, or snaps to the anchor of the merge it enters. */
export function stepOut(merges: readonly Rect[], prev: Pos, to: Pos, cols: number, rows: number): Pos {
  const from = mergeAt(merges, prev.col, prev.row);
  let p = to;
  if (from && mergeAt(merges, to.col, to.row) === from) {
    p = {
      col: to.col > prev.col ? from.c1 + 1 : to.col < prev.col ? from.c0 - 1 : to.col,
      row: to.row > prev.row ? from.r1 + 1 : to.row < prev.row ? from.r0 - 1 : to.row,
    };
    p = { col: Math.max(0, Math.min(cols - 1, p.col)), row: Math.max(0, Math.min(rows - 1, p.row)) };
  }
  const m = mergeAt(merges, p.col, p.row);
  if (!m) return p;
  // clamped back into the merge we came from (sheet edge): stay on its anchor
  return { col: m.c0, row: m.r0 };
}

/** Merges after inserting/deleting rows or columns: they move, grow or shrink with their cells; those left with one cell or fewer are dropped. */
export function shiftMerges(merges: readonly string[], e: StructEdit): string[] {
  const out: string[] = [];
  for (const s of merges) {
    const next = shiftRange(s, e);
    if (next && isMulti(parseRect(next))) out.push(next);
  }
  return out;
}
