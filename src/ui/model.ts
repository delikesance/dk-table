/** Workbook model: sheets with per-sheet styles and undo/redo snapshot stacks. */
import { createSheet, setCell, type Sheet } from "../engine/sheet";
import type { CellStyle, DocSheet } from "../io/types";

/** Visual/format style of one cell (persisted in .dktable; `format` = number-format code). */
export type { CellStyle };

/** Raw cells map (used to rebuild an engine sheet). */
export type Snap = Record<string, { raw: string }>;

/** Undo/redo state: raw cells + cell styles, restored together. */
export interface State {
  cells: Snap;
  styles: Record<string, CellStyle>;
}

/** One sheet of the workbook. */
export interface Entry {
  id: string;
  name: string;
  sheet: Sheet;
  styles: Record<string, CellStyle>;
  undo: State[];
  redo: State[];
  /** Frozen panes (top rows / left cols), persisted in .dktable; absent = none. Not part of undo. */
  freeze?: { rows: number; cols: number };
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
    id: doc?.id ?? uid(), name, styles: structuredClone(doc?.styles ?? {}), undo: [], redo: [],
    sheet: buildSheet(doc?.cells ?? {}, doc?.cols, doc?.rows),
    ...(doc?.freeze ? { freeze: { ...doc.freeze } } : {}),
  };
}

/** Deep copy of the entry's raw cells and styles. */
export function snapshot(e: Entry): State {
  return JSON.parse(JSON.stringify({ cells: e.sheet.cells, styles: e.styles })) as State;
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
  e.styles = snap.styles;
  e.sheet = buildSheet(snap.cells, e.sheet.cols, e.sheet.rows);
  return true;
}
