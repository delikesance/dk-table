/** Grid lifecycle of the app: (re)build, info sync, redraw after edits, tabs refresh. */
import { getDisplay, getRaw, getValue, setCell } from "../engine/sheet";
import { createGrid } from "./grid/grid";
import type { GridView } from "./grid/types";
import { MAX_ROWS } from "./grid/virtual";
import { lastUsedRow, rowsNeeded } from "../engine/rows";
import { checkCells } from "./limits";
import { pushUndo } from "./model";
import { liveCell, paintCell } from "./cellview";
import { computeCf } from "../engine/cf/compute";
import { sheetEnv } from "../engine/cf/env";
import { CUSTOM, formatValue } from "./numfmt";
import { toInput } from "./formula/syntax";
import { displayGap, decimalMode } from "../engine/decimal";
import { fitColumns } from "./appFit";
import { colsOfSelection } from "./grid/fit";
import { markInvalid, notifyInvalid } from "./appValidation";
import { firstKey, keysOf, setTitle, type Ctx } from "./appState";
import { clearSpecial } from "./appSpecial";
import { mergeRects } from "./appMerge";

/** Per-sheet grid view state (column widths, filters): survives rebuilds, widths and freeze come from the entry (saved in files), filters are not saved; `viewOf(entry)` gets/creates it. */
const views = new WeakMap<object, GridView>();
export const viewOf = (e: object): GridView => {
  let v = views.get(e);
  if (!v) views.set(e, (v = { widths: {}, filters: {} }));
  return v;
};

/** Scroll offsets and selection of a sheet as last left; `shown` maps a live grid to its sheet's saved slot. */
interface SheetPos { top: number; left: number; sel?: string }
const saved = new WeakMap<object, SheetPos>();
const shown = new WeakMap<object, object>();

/** Sync formula bar, sidebar info and toolbar state with the active cell. */
export function syncInfo(c: Ctx): void {
  const key = firstKey(c);
  const raw = getRaw(c.cur.sheet, key);
  c.fbar.setCell(key, raw);
  c.sidebar.setCellInfo({ ref: key, raw: toInput(raw), display: getDisplay(c.cur.sheet, key), format: "Standard" });
  const keys = keysOf(c.grid.getSelection());
  c.status.update(keys.length, keys.length > 1 ? keys.map((k) => getValue(c.cur.sheet, k)) : []);
  const st = c.cur.styles[key] ?? {};
  c.toolbar.setState({ bold: !!st.bold, italic: !!st.italic, underline: !!st.underline, wrap: !!st.wrap, align: st.align ?? "left",
    format: st.format ?? "general", canUndo: c.cur.undo.length > 0, canRedo: c.cur.redo.length > 0 });
}

/** Rendered DOM cell of `key` in the active grid, if any. */
const cellEl = (c: Ctx, key: string): HTMLElement | null =>
  c.gridHost.querySelector<HTMLElement>(`.dkg-cell[data-key="${key}"]`);

/** Repaint the style of one rendered cell (own style + conditional style). */
export function paintKey(c: Ctx, key: string): void {
  const el = cellEl(c, key);
  if (el) paintCell(el, c.cur.styles[key], c.cfMap?.get(key));
}

/**
 * Recompute the conditional formatting of the active sheet; with `repaint`, restyle the rendered
 * cells whose conditional style was or is set (cells never touched by a rule are left alone).
 */
export function refreshCf(c: Ctx, repaint = true): void {
  const prev = c.cfMap;
  c.cfMap = c.cur.cf.length ? computeCf(c.cur.cf, sheetEnv(c.cur.sheet)) : new Map();
  if (!repaint || (!prev?.size && !c.cfMap.size)) return;
  for (const el of c.gridHost.querySelectorAll<HTMLElement>(".dkg-cell[data-key]")) {
    const k = el.dataset.key!;
    if (prev?.has(k) || c.cfMap.has(k)) paintCell(el, c.cur.styles[k], c.cfMap.get(k));
  }
}

/** Grow the sheet by blocks when the data reaches its free-row reserve (no row cap); rebuilds the grid only when it changes. */
function growRows(c: Ctx): void {
  const s = c.cur.sheet;
  const rows = rowsNeeded(lastUsedRow(Object.keys(s.cells)), s.rows);
  if (rows === s.rows) return;
  s.rows = rows;
  buildGrid(c);
}

/** Refresh the workbook weight shown in the status bar (O(cells): called on data changes and grid builds, not on selection). */
export function weigh(c: Ctx): void {
  c.status.weigh(Object.values(c.cur.sheet.cells).map((x) => x.raw));
}

/** After a data change: redraw all cells (dependents), conditional formats, and mark modified. */
export function touch(c: Ctx): void {
  growRows(c);
  setTitle(c, true);
  c.grid.refresh();
  refreshCf(c);
  syncInfo(c);
  markInvalid(c);
  weigh(c);
  c.docEd?.refresh();
}

/** Rebuild the grid for the current sheet. */
/** Plan de la feuille active: niveau par ligne (0 à 3, absente = 0), tous les groupes dépliés. Vue seule. */
export function setOutlineLevels(c: Ctx, levels: number[]): void {
  c.grid.setOutline({ levels: Array.from({ length: c.cur.sheet.rows }, (_, r) => levels[r] ?? 0), collapsed: [] });
}

export function buildGrid(c: Ctx): void {
  const old = c.gridHost.querySelector<HTMLElement>(".dkg");
  const prev = c.grid && shown.get(c.grid);
  if (prev && old) saved.set(prev, { top: old.scrollTop, left: old.scrollLeft, sel: c.grid.getSelection() });
  c.grid?.destroy();
  c.gridHost.replaceChildren();
  c.cur.sheet.rows = rowsNeeded(lastUsedRow(Object.keys(c.cur.sheet.cells)), Math.max(c.cur.sheet.rows, MAX_ROWS));
  const view = viewOf(c.cur);
  view.freeze = c.cur.freeze;
  view.widths = c.cur.widths;
  refreshCf(c, false);
  markInvalid(c); // before the grid exists: only fills `c.invalid`, cells are marked as they are created
  weigh(c);
  c.grid = createGrid(c.gridHost, {
    cols: c.cur.sheet.cols, rows: c.cur.sheet.rows, view,
    getDisplay: (k) => formatValue(getDisplay(c.cur.sheet, k), c.cur.styles[k]?.format),
    getRaw: (k) => getRaw(c.cur.sheet, k),
    numeric: (k) => (c.cur.styles[k]?.format ?? "").startsWith(CUSTOM),
    onEdit: (k, raw) => {
      checkCells({ [k]: raw });
      if (!c.coalescing) {
        pushUndo(c.cur);
        c.coalescing = true;
        queueMicrotask(() => { c.coalescing = false; touch(c); });
      }
      setCell(c.cur.sheet, k, raw);
    },
    merges: () => mergeRects(c.cur),
    onBulk: () => queueMicrotask(() => notifyInvalid(c)), // after the coalesced touch
    onSelect: () => { clearSpecial(c); syncInfo(c); },
    onResizeStart: () => { pushUndo(c.cur); setTitle(c, true); syncInfo(c); },
    onFitColumn: (col) => { const sel = colsOfSelection(c.grid.getSelection()); fitColumns(c, sel.length > 1 && sel.includes(col) ? sel : [col]); },
    onSheetStep: (d) => stepSheet(c, d),
    onFreeze: (f) => c.app.setFreeze(f),
    onCopy: (ref, text) => { c.lastCopy = ref ? { text, sheet: c.cur.id, ref } : undefined; },
    renderCell: (k) => liveCell(c.cur.sheet, k),
    gap: (k) => {
      const v = decimalMode() ? getValue(c.cur.sheet, k) : "";
      return typeof v === "number" && displayGap(v, c.cur.styles[k]?.format) ? `Affiché ≠ stocké : ${v}` : undefined;
    },
    // rows are virtualized: styles are re-applied whenever a cell element is (re)created
    onCellCreated: (k, el) => {
      if (c.invalid?.has(k)) el.dataset.inv = "";
      if (c.special?.has(k)) el.classList.add("dkg-special");
      const st = c.cur.styles[k], cf = c.cfMap?.get(k);
      if (st || cf) paintCell(el, st, cf);
    },
  });
  c.gridHost.querySelector(".dkg")?.addEventListener("contextmenu", (e) => c.app.hooks.context?.(e as MouseEvent));
  shown.set(c.grid, c.cur);
  const pos = saved.get(c.cur);
  const root = c.gridHost.querySelector<HTMLElement>(".dkg");
  if (pos?.sel) c.grid.select(pos.sel); // reveals the cursor, so the saved scroll is applied after
  if (pos && root) { root.scrollTop = pos.top; root.scrollLeft = pos.left; root.dispatchEvent(new Event("scroll")); }
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
  c.tabs.setSheets([
    ...c.entries.map(({ id, name }) => ({ id, name })),
    ...c.docs.list().map(({ id, name }) => ({ id, name, kind: "doc" as const })),
    ...c.macroTabs.flatMap((id) => { const m = c.app.macros.get(id); return m ? [{ id, name: m.name, kind: "macro" as const }] : []; }),
  ]);
  c.tabs.setActive(c.curMacro ?? c.curDoc ?? c.cur.id);
  c.docEd?.refresh();
}
