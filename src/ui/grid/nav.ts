/**
 * Pure keyboard-navigation math of the grid (no DOM): arrows, Ctrl+arrows (Excel data-block jumps),
 * Home, Ctrl+Home/End, PageUp/Down and the selection shortcuts Ctrl+A, Ctrl+Space, Shift+Space.
 */
import type { Pos } from "./keys";
import { stepRow } from "./filterView";

/** Selection: `anchor` is the fixed corner, `active` the cursor. */
export interface Sel { anchor: Pos; active: Pos }

/** Sheet facts navigation needs. */
export interface NavEnv {
  cols: number;
  rows: number;
  /** Visible rows (filtered view, ascending) or null when every row is shown. */
  order: number[] | null;
  /** Rows per page (PageUp/PageDown). */
  page: number;
  /** True when the cell holds content. */
  filled(col: number, row: number): boolean;
}

/** Navigation request; `move` jumps over data blocks when `jump` (Ctrl). */
export type NavAction =
  | { kind: "move"; dc: number; dr: number; jump?: boolean }
  | { kind: "home" | "top" | "end" | "pageUp" | "pageDown" | "all" | "cols" | "rows" };

/**
 * Excel Ctrl+arrow along `line` (positions in display order) from index `i` towards `dir`:
 * inside a block -> its last cell; otherwise -> next filled cell; none -> the edge.
 */
export function jumpAlong(line: number[], i: number, dir: 1 | -1, filled: (p: number) => boolean): number {
  const ok = (j: number) => j >= 0 && j < line.length;
  let j = i + dir;
  if (!ok(j)) return line[i];
  if (filled(line[i]) && filled(line[j])) {
    while (ok(j + dir) && filled(line[j + dir])) j += dir;
    return line[j];
  }
  while (ok(j) && !filled(line[j])) j += dir;
  return line[ok(j) ? j : j - dir];
}

/** Last used column and row (independently, like Excel's Ctrl+End), or null on an empty sheet. */
export function usedBounds(env: NavEnv): Pos | null {
  let col = -1, row = -1;
  for (let r = 0; r < env.rows; r++)
    for (let c = 0; c < env.cols; c++)
      if (env.filled(c, r)) { if (c > col) col = c; row = r; }
  return row < 0 ? null : { col, row };
}

/** Whole rows fitting in a viewport of `viewportH` px under a header of one row, at least 1. */
export function pageRows(viewportH: number, rowH: number): number {
  return Math.max(1, Math.floor((viewportH - rowH) / rowH));
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const sign = (n: number): 1 | -1 => (n < 0 ? -1 : 1);

/** Cursor target of a move (plain step or Ctrl jump), clamped to the sheet and the filtered rows. */
function moveTo(p: Pos, dc: number, dr: number, jump: boolean, env: NavEnv): Pos {
  let { col, row } = p;
  if (dc) col = jump ? jumpAlong(range(env.cols), col, sign(dc), (c) => env.filled(c, row))
    : Math.max(0, Math.min(env.cols - 1, col + dc));
  if (dr && jump) {
    const line = env.order ?? range(env.rows);
    let i = line.findIndex((r) => r >= row);
    if (i < 0) i = line.length - 1;
    row = jumpAlong(line, i, sign(dr), (r) => env.filled(col, r));
  } else if (dr) row = stepRow(env.order, row, dr, env.rows, false);
  return { col, row };
}

/** Selection after action `a`; `extend` (Shift) keeps the anchor for cursor moves. */
export function navigate(a: NavAction, s: Sel, extend: boolean, env: NavEnv): Sel {
  const { anchor, active } = s;
  const last = { col: env.cols - 1, row: env.rows - 1 };
  if (a.kind === "all") return { anchor: usedBounds(env) ?? last, active: { col: 0, row: 0 } };
  if (a.kind === "cols") return { anchor: { col: anchor.col, row: last.row }, active: { col: active.col, row: 0 } };
  if (a.kind === "rows") return { anchor: { col: last.col, row: anchor.row }, active: { col: 0, row: active.row } };
  let to: Pos;
  if (a.kind === "move") to = moveTo(active, a.dc, a.dr, !!a.jump, env);
  else if (a.kind === "home") to = { col: 0, row: active.row };
  else if (a.kind === "top") to = { col: 0, row: env.order?.[0] ?? 0 };
  else if (a.kind === "end") to = usedBounds(env) ?? { col: 0, row: 0 };
  else to = moveTo(active, 0, a.kind === "pageDown" ? env.page : -env.page, false, env);
  return { anchor: extend ? anchor : to, active: to };
}
