/** Shared mutable state of the running app (`Ctx`) and small helpers over it. */
import { parseKey, rangeKeys } from "./grid/keys";
import type { Grid } from "./grid/grid";
import type { Toolbar, FormulaBar } from "./toolbar";
import type { SheetTabs } from "./tabs/tabs";
import type { Sidebar, RecentFile } from "./sidebar/sidebar";
import { linkBook, type Entry } from "./model";
import type { App } from "./appTypes";
import type { MacroUi } from "./macros/wire";
import type { CfStyle } from "../engine/cf/types";
import type { DocStore } from "../doc/store";
import type { DocEditor } from "../doc/editor";
import type { CopyInfo } from "../doc/refs";

/** Everything the app modules share; widgets/app are filled in during mount. */
export interface Ctx {
  gridHost: HTMLElement;
  /** Host of the document editor (shown instead of the grid while a document is open). */
  docHost: HTMLElement;
  /** Rich-text documents of the workbook. */
  docs: DocStore;
  /** Id of the open document, or undefined when the grid is shown. */
  curDoc?: string;
  /** Document to come back to (Alt+←) after following a reference into a sheet. */
  backDoc?: string;
  /** Editor of the open document. */
  docEd?: DocEditor;
  /** Host of the macro editor view (shown instead of the grid while a macro tab is active). */
  macroHost: HTMLElement;
  /** Ids of the macro editor tabs, in opening order. */
  macroTabs: string[];
  /** Id of the macro whose editor is shown, or undefined. */
  curMacro?: string;
  /** Editor of the macro tab being shown. */
  macroView?: { destroy(): void; focus(): void };
  /** Close the macro editor view (set by mount); returns true when one was open. */
  leaveMacro?(): boolean;
  /** Sheet and document side by side (Ctrl+\\). */
  split?: boolean;
  /** Rebuild the menu bar (set by mount; called when a document opens or closes). */
  rebuildMenus?(): void;
  /** Last range copied in the grid (documents paste it as a live reference). */
  lastCopy?: CopyInfo;
  entries: Entry[];
  /** Active sheet entry. */
  cur: Entry;
  recents: RecentFile[];
  /** True while grouped edits (paste/clear) are merged into one undo step. */
  coalescing: boolean;
  grid: Grid;
  toolbar: Toolbar;
  fbar: FormulaBar;
  sidebar: Sidebar;
  tabs: SheetTabs;
  app: App;
  /** Lazy macro panel/runner (set in mount, after the layout exists). */
  macroUi: MacroUi;
  /** Conditional style per cell of the active sheet (recomputed by `refreshCf`). */
  cfMap?: Map<string, CfStyle>;
  /** Autosave controller (set by setupAutosave); touched on every modification. */
  autosave?: { touch(): void };
  /** Last autosave state, shown in the title. */
  autosaveState?: "idle" | "pending" | "saving" | "saved" | "error";
  /** Counter bumped on every modification (detects edits made during a write). */
  version?: number;
}

/** Re-bind the workbook (after sheets are added, removed, renamed or rebuilt by undo/redo). */
export const relink = (c: Ctx): void => linkBook(() => c.entries);

/** Expand a selection ("A1" or "A1:B3") into its cell keys. */
export function keysOf(sel: string): string[] {
  const [a, b = a] = sel.split(":");
  return rangeKeys(parseKey(a), parseKey(b));
}

/** Top-left cell key of the current selection. */
export const firstKey = (c: Ctx): string => c.grid.getSelection().split(":")[0];

/** Status suffix of the window title for the autosave state (empty when nothing to say). */
function statusOf(c: Ctx, dirty: boolean): string {
  if (c.autosaveState === "saving") return " · Enregistrement…";
  if (c.autosaveState === "error") return " · Erreur d'enregistrement";
  if (c.autosaveState === "saved" && !dirty) return " · Enregistré";
  return "";
}

/** Repaint the window title (file name, dirty marker, autosave status) from `c.app`. */
export function renderTitle(c: Ctx): void {
  const dirty = !!c.app.dirty;
  document.title = `${c.app.path?.split(/[\\/]/).pop() ?? "Sans titre"}${dirty ? " •" : ""} — dk-table${statusOf(c, dirty)}`;
}

/** Set the dirty flag and update the title; a modification also schedules an autosave. */
export function setTitle(c: Ctx, dirty: boolean): void {
  c.app.dirty = dirty;
  if (dirty) { c.version = (c.version ?? 0) + 1; c.autosave?.touch(); }
  renderTitle(c);
}
