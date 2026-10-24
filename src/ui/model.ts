/** Workbook model: sheets with per-sheet styles and undo/redo snapshot stacks. */
import { createSheet, setCell, type Sheet } from "../engine/sheet";
import type { DocSheet } from "../io/types";

/** Visual style of one cell (session-only, not persisted in .dktable v1). */
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  fill?: string;
}

/** Raw cells snapshot used by undo/redo. */
export type Snap = Record<string, { raw: string }>;

/** One sheet of the workbook. */
export interface Entry {
  id: string;
  name: string;
  sheet: Sheet;
  styles: Record<string, CellStyle>;
  undo: Snap[];
  redo: Snap[];
}

const MAX_UNDO = 100;
let seq = 0;

/** Unique sheet id. */
export function uid(): string {
  return `s${Date.now().toString(36)}${(seq++).toString(36)}`;
}

/** Build an engine sheet (>= 26x100) filled from raw cells. */
export function buildSheet(cells: Snap, cols = 26, rows = 100): Sheet {
  const s = createSheet();
  s.cols = Math.max(cols, 26);
  s.rows = Math.max(rows, 100);
  for (const [k, c] of Object.entries(cells)) setCell(s, k, c.raw);
  return s;
}

/** New workbook entry, optionally from a persisted sheet. */
export function newEntry(name: string, doc?: Partial<DocSheet>): Entry {
  return {
    id: doc?.id ?? uid(), name, styles: {}, undo: [], redo: [],
    sheet: buildSheet(doc?.cells ?? {}, doc?.cols, doc?.rows),
  };
}

/** Copy of the entry's raw cells. */
export function snapshot(e: Entry): Snap {
  return JSON.parse(JSON.stringify(e.sheet.cells)) as Snap;
}

/** Record the current state before a change (clears redo). */
export function pushUndo(e: Entry): void {
  e.undo.push(snapshot(e));
  if (e.undo.length > MAX_UNDO) e.undo.shift();
  e.redo = [];
}

/** Swap `from` stack top into the sheet, pushing current state on `to`. Returns false if empty. */
export function step(e: Entry, from: "undo" | "redo"): boolean {
  const src = e[from], dst = e[from === "undo" ? "redo" : "undo"];
  const snap = src.pop();
  if (!snap) return false;
  dst.push(snapshot(e));
  e.sheet = buildSheet(snap, e.sheet.cols, e.sheet.rows);
  return true;
}

/** Run direct engine writes on the entry's sheet as one undo step; returns false (no step kept) if nothing changed. */
export function batchEdit(e: Entry, fn: (sheet: Sheet) => void): boolean {
  const before = JSON.stringify(e.sheet.cells);
  pushUndo(e);
  fn(e.sheet);
  if (JSON.stringify(e.sheet.cells) !== before) return true;
  e.undo.pop();
  return false;
}
