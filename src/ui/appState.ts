/** Shared mutable state of the running app (`Ctx`) and small helpers over it. */
import { parseKey, rangeKeys } from "./grid/keys";
import type { Grid } from "./grid/grid";
import type { Toolbar, FormulaBar } from "./toolbar";
import type { SheetTabs } from "./tabs/tabs";
import type { Sidebar, RecentFile } from "./sidebar/sidebar";
import type { Entry } from "./model";
import type { App } from "./appTypes";
import type { MacroUi } from "./macros/wire";

/** Everything the app modules share; widgets/app are filled in during mount. */
export interface Ctx {
  gridHost: HTMLElement;
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
  /** Autosave controller (set by setupAutosave); touched on every modification. */
  autosave?: { touch(): void };
  /** Last autosave state, shown in the title. */
  autosaveState?: "idle" | "pending" | "saving" | "saved" | "error";
  /** Counter bumped on every modification (detects edits made during a write). */
  version?: number;
}

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
