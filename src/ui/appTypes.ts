/** Public types of the app handle (shared by app shell, commands and file ops). */
import type { DktDoc, DocSheet } from "../io/types";
import type { SheetInfo } from "./tabs/tabs";
import type { RecentFile } from "./sidebar/sidebar";
import type { CellStyle } from "./model";

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
  /** Edit a cell (undoable) and recalculate dependents. */
  edit(key: string, raw: string): void;
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
  /** Style of the active cell. */
  activeStyle(): CellStyle;
  toggleSidebar(): void;
  /** Start `=NAME(` in the active cell. */
  insertFunction(name: string): void;
  recents(): RecentFile[];
  addRecent(path: string): void;
  /** Mark the document as saved (clears the title dirty marker). */
  markSaved(): void;
}
