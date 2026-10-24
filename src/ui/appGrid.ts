/** Grid lifecycle of the app: (re)build, info sync, redraw after edits, tabs refresh. */
import { getDisplay, getRaw, setCell } from "../engine/sheet";
import { createGrid } from "./grid/grid";
import type { GridView } from "./grid/types";
import { MAX_ROWS } from "./grid/virtual";
import { pushUndo } from "./model";
import { liveCell, paintStyle } from "./cellview";
import { formatValue } from "./numfmt";
import { firstKey, setTitle, type Ctx } from "./appState";

/** Per-sheet grid view state (column widths, filters): survives rebuilds, not saved in files (freeze comes from the entry); `viewOf(entry)` gets/creates it. */
const views = new WeakMap<object, GridView>();
export const viewOf = (e: object): GridView => {
  let v = views.get(e);
  if (!v) views.set(e, (v = { widths: {}, filters: {} }));
  return v;
};

/** Sync formula bar, sidebar info and toolbar state with the active cell. */
export function syncInfo(c: Ctx): void {
  const key = firstKey(c);
  const raw = getRaw(c.cur.sheet, key);
  c.fbar.setCell(key, raw);
  c.sidebar.setCellInfo({ ref: key, raw, display: getDisplay(c.cur.sheet, key), format: "Standard" });
  const st = c.cur.styles[key] ?? {};
  c.toolbar.setState({ bold: !!st.bold, italic: !!st.italic, underline: !!st.underline, wrap: !!st.wrap, align: st.align ?? "left",
    format: st.format ?? "general", canUndo: c.cur.undo.length > 0, canRedo: c.cur.redo.length > 0 });
}

/** After a data change: redraw all cells (dependents) and mark modified. */
export function touch(c: Ctx): void {
  setTitle(c, true);
  c.grid.refresh();
  syncInfo(c);
}

/** Rebuild the grid for the current sheet. */
export function buildGrid(c: Ctx): void {
  const prevSel = c.grid?.getSelection();
  c.grid?.destroy();
  c.gridHost.replaceChildren();
  c.cur.sheet.rows = Math.max(c.cur.sheet.rows, MAX_ROWS);
  const view = viewOf(c.cur);
  view.freeze = c.cur.freeze;
  c.grid = createGrid(c.gridHost, {
    cols: c.cur.sheet.cols, rows: c.cur.sheet.rows, view,
    getDisplay: (k) => formatValue(getDisplay(c.cur.sheet, k), c.cur.styles[k]?.format),
    getRaw: (k) => getRaw(c.cur.sheet, k),
    onEdit: (k, raw) => {
      if (!c.coalescing) {
        pushUndo(c.cur);
        c.coalescing = true;
        queueMicrotask(() => { c.coalescing = false; touch(c); });
      }
      setCell(c.cur.sheet, k, raw);
    },
    onSelect: () => syncInfo(c),
    onSheetStep: (d) => stepSheet(c, d),
    onFreeze: (f) => c.app.setFreeze(f),
    renderCell: (k) => liveCell(c.cur.sheet, k),
    // rows are virtualized: styles are re-applied whenever a cell element is (re)created
    onCellCreated: (k) => { const st = c.cur.styles[k]; if (st) paintStyle(c.gridHost, k, st); },
  });
  c.gridHost.querySelector(".dkg")?.addEventListener("contextmenu", (e) => c.app.hooks.context?.(e as MouseEvent));
  if (prevSel) c.grid.select(prevSel);
  c.grid.focus();
  syncInfo(c);
}

/** Ctrl+PageUp/PageDown: activate the previous (-1) / next (+1) sheet in tab order; no wrap-around. */
export function stepSheet(c: Ctx, dir: -1 | 1): void {
  const next = c.entries[c.entries.indexOf(c.cur) + dir];
  if (next) c.app.switchSheet(next.id);
}

/** Push the sheet list and active sheet to the tab bar. */
export function refreshTabs(c: Ctx): void {
  c.tabs.setSheets(c.entries.map(({ id, name }) => ({ id, name })));
  c.tabs.setActive(c.cur.id);
}
