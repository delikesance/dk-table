/** Shared mutable state of the running app (`Ctx`) and small helpers over it. */
import { parseKey, rangeKeys } from "./grid/keys";
import type { Grid } from "./grid/grid";
import type { Toolbar, FormulaBar } from "./toolbar";
import type { SheetTabs } from "./tabs/tabs";
import type { Sidebar, RecentFile } from "./sidebar/sidebar";
import type { Entry } from "./model";
import type { App } from "./appTypes";

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
}

/** Expand a selection ("A1" or "A1:B3") into its cell keys. */
export function keysOf(sel: string): string[] {
  const [a, b = a] = sel.split(":");
  return rangeKeys(parseKey(a), parseKey(b));
}

/** Top-left cell key of the current selection. */
export const firstKey = (c: Ctx): string => c.grid.getSelection().split(":")[0];

/** Update the window title with the file name and a dirty marker. */
export function setTitle(c: Ctx, dirty: boolean): void {
  c.app.dirty = dirty;
  document.title = `${c.app.path?.split(/[\\/]/).pop() ?? "Sans titre"}${dirty ? " •" : ""} — dk-table`;
}
