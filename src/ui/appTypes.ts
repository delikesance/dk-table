/** Public types of the app handle (shared by app shell, commands and file ops). */
import type { DktDoc, DocSheet } from "../io/types";
import type { SheetInfo } from "./tabs/tabs";
import type { RecentFile } from "./sidebar/sidebar";
import type { Sheet } from "../engine/sheet";
import type { CellStyle } from "./model";
import type { BorderMode } from "./borders";

/** Hooks set by the command layer (file ops, context menu). */
export interface Hooks {
  /** Right-click on the grid. */
  context?: (e: MouseEvent) => void;
  /** Named command from toolbar/sidebar ("open", "save", "recent:<path>"). */
  command?: (id: string) => void;
}

/** Public handle of the running app (used by commands, shortcuts and tests). */
export interface App {
  hooks: Hooks;
  path: string | undefined;
  /** True when there are unsaved changes (set by setTitle). */
  dirty?: boolean;
  /** Edit a cell (undoable) and recalculate dependents. */
  edit(key: string, raw: string): void;
  /** Edit several cells as ONE undo step and ONE refresh (paste/clear). */
  editMany(cells: Record<string, string>): void;
  /** Run `fn` on the active sheet as ONE undo step (macros), then refresh the grid. */
  runBatch<T>(fn: (sheet: Sheet) => Promise<T>): Promise<T>;
  undo(): void;
  redo(): void;
  addSheet(): void;
  switchSheet(id: string): void;
  sheets(): SheetInfo[];
  /** Whole workbook as a persistable document. */
  toDoc(): DktDoc;
  /** Active sheet as a persistable sheet (CSV export). */
  activeDoc(): DocSheet;
  loadDoc(doc: DktDoc, path?: string): void;
  /** Add a sheet from imported cells and activate it. */
  importSheet(name: string, sheet: Pick<DocSheet, "cols" | "rows" | "cells">): void;
  selection(): string;
  selectedKeys(): string[];
  select(key: string): void;
  /** Merge a style patch into every selected cell. */
  style(patch: CellStyle): void;
  /** Apply a « Bordures » mode to the selection (per-cell edges, one undo step). */
  borders(mode: BorderMode): void;
  /** Style of the active cell. */
  activeStyle(): CellStyle;
  toggleSidebar(): void;
  /** Write a complete `=NAME()` in the active cell; no-op if the cell is not empty (never overwrites). */
  insertFunction(name: string): void;
  recents(): RecentFile[];
  addRecent(path: string): void;
  /** Sort the active column's data block (one undo step); false when nothing to sort. */
  sortColumn(desc: boolean): boolean;
  /** Mark the document as saved (clears the title dirty marker). */
  markSaved(): void;
}
