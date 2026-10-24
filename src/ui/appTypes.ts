/** Public types of the app handle (shared by app shell, commands and file ops). */
import type { DktDoc, DocSheet } from "../io/types";
import type { SheetInfo } from "./tabs/tabs";
import type { RecentFile } from "./sidebar/sidebar";
import type { Sheet } from "../engine/sheet";
import type { CellStyle } from "./model";
import type { BorderMode } from "./borders";
import type { MacroStore } from "../macros/store";
import type { RunResult } from "../macros/lua";
import type { CfRule } from "../engine/cf/types";
import type { DocEditor } from "../doc/editor";

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
  /** Export the open document (md / html through the save dialog, pdf through printing). */
  exportDoc(kind: "md" | "html" | "pdf"): Promise<void>;
  /** Add a sheet from imported cells and activate it. */
  importSheet(name: string, sheet: Pick<DocSheet, "cols" | "rows" | "cells">): void;
  selection(): string;
  selectedKeys(): string[];
  select(key: string): void;
  /** Merge a style patch into every selected cell. */
  style(patch: CellStyle): void;
  /** Apply a « Bordures » mode to the selection (per-cell edges, one undo step). */
  borders(mode: BorderMode): void;
  /** Style of the active cell (own style; conditional formats are not included). */
  activeStyle(): CellStyle;
  /** Conditional formatting rules of the active sheet, by priority (a copy). */
  cfRules(): CfRule[];
  /** Replace the active sheet's conditional formatting rules (one undo step, repaints). */
  setCfRules(rules: CfRule[]): void;
  toggleSidebar(): void;
  /** Write a complete `=NAME()` in the active cell; no-op if the cell is not empty (never overwrites). */
  insertFunction(name: string): void;
  recents(): RecentFile[];
  addRecent(path: string): void;
  /** Sort the active column's data block (one undo step); false when nothing to sort. */
  sortColumn(desc: boolean): boolean;
  /** Insert as many rows as selected, above the selection (one undo step, refs rewritten). */
  insertRows(): void;
  /** Delete the rows spanned by the selection (one undo step; refs to them become #REF!). */
  deleteRows(): void;
  /** Insert as many columns as selected, left of the selection (one undo step). */
  insertCols(): void;
  /** Delete the columns spanned by the selection (one undo step). */
  deleteCols(): void;
  /** Mark the document as saved (clears the title dirty marker). */
  markSaved(): void;
  /** Freeze the top `rows` rows / left `cols` columns of the active sheet (0,0 = unfreeze); persisted, not undoable. */
  setFreeze(f: { rows: number; cols: number }): void;
  /** Frozen rows/cols of the active sheet ({0,0} when none). */
  getFreeze(): { rows: number; cols: number };
  /** Lua macros of the workbook (persisted with the document). */
  macros: MacroStore;
  /** Apply direct engine writes to the active sheet as one undo step, then redraw. */
  batch(fn: (sheet: Sheet) => void): void;
  /** Name of the active sheet. */
  sheetName(): string;
  /** Run a macro on the active sheet (Lua VM loaded on first use). */
  runMacro(id: string): Promise<RunResult>;
  /** Open the macro panel (on `id` if given). */
  openMacros(id?: string): Promise<void>;
  /** Create a dk doc (rich-text document of the workbook), open it, return its id. */
  addDoc(): string;
  /** Show document `id` in place of the grid. */
  openDoc(id: string): Promise<void>;
  /** Delete document `id`. */
  removeDoc(id: string): void;
  /** Id of the open document, undefined when the grid is shown. */
  activeDocId(): string | undefined;
  /** Editor of the open document. */
  docEditor(): DocEditor | undefined;
}
