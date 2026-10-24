/** Grid lifecycle of the app: (re)build, info sync, redraw after edits, tabs refresh. */
import { getDisplay, getRaw, setCell } from "../engine/sheet";
import { createGrid } from "./grid/grid";
import { pushUndo } from "./model";
import { liveCell, paintStyle } from "./cellview";
import { formatValue } from "./numfmt";
import { firstKey, setTitle, type Ctx } from "./appState";

/** Sync formula bar, sidebar info and toolbar state with the active cell. */
export function syncInfo(c: Ctx): void {
  const key = firstKey(c);
  const raw = getRaw(c.cur.sheet, key);
  c.fbar.setCell(key, raw);
  c.sidebar.setCellInfo({ ref: key, raw, display: getDisplay(c.cur.sheet, key), format: "Standard" });
  const st = c.cur.styles[key] ?? {};
  c.toolbar.setState({ bold: !!st.bold, italic: !!st.italic, align: st.align ?? "left",
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
  c.gridHost.replaceChildren();
  c.grid = createGrid(c.gridHost, {
    cols: c.cur.sheet.cols, rows: c.cur.sheet.rows,
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
    renderCell: (k) => liveCell(c.cur.sheet, k),
  });
  Object.keys(c.cur.styles).forEach((k) => paintStyle(c.gridHost, k, c.cur.styles[k]));
  c.gridHost.querySelector(".dkg")?.addEventListener("contextmenu", (e) => c.app.hooks.context?.(e as MouseEvent));
  syncInfo(c);
}

/** Push the sheet list and active sheet to the tab bar. */
export function refreshTabs(c: Ctx): void {
  c.tabs.setSheets(c.entries.map(({ id, name }) => ({ id, name })));
  c.tabs.setActive(c.cur.id);
}
