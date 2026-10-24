/**
 * Spreadsheet grid component: headers, selection, inline editing, TSV copy/paste.
 * Rows are virtualized (see window.ts): only visible rows + overscan exist in the DOM, the full
 * height is simulated by CSS grid tracks; refresh() touches only given (rendered) cells.
 */
import { keyOf, parseKey, rangeKeys, type Pos } from "./keys";
import { ROW_H, scrollToRow } from "./virtual";
import { navigate, pageRows, type NavAction } from "./nav";
import { FALLBACK_VIEWPORT_H, addHeaders, createRowWindow } from "./window";
import { createFreezeCtl } from "./freezeView";
import { markSelection } from "./mark";
import { bindClipboard } from "./clipboard";
import { shiftFormula } from "../../engine/refs";
import { bindKeys } from "./gridKeys";
import { fillPlan } from "./fill";
import { createFilterCtl } from "./gridFilter";
import { stepRow } from "./filterView";
import { openEditor, type Editor } from "./editor";
import { addResizers, templateColumns } from "./colwidth";
import type { Grid, GridOptions } from "./types";
import { markKind } from "./cellkind";

export type { Grid, GridOptions } from "./types";

/** Build the grid inside `host` and return its API. */
export function createGrid(host: HTMLElement, opts: GridOptions): Grid {
  const { cols, rows } = opts;
  let anchor: Pos = { col: 0, row: 0 };
  let active: Pos = { col: 0, row: 0 };
  let editor: Editor | null = null;
  let dragging = false;
  let marked: HTMLElement[] = [];
  const root = document.createElement("div");
  root.className = "dkg";
  root.tabIndex = 0;
  const view = opts.view ?? { widths: {}, filters: {} };
  const applyWidths = (): void => { root.style.gridTemplateColumns = templateColumns(view.widths, cols); };
  applyWidths();
  const colHeads = addHeaders(root, cols);
  host.appendChild(root);
  const fz = createFreezeCtl(root, view, cols, rows, (r) => ctl.hidden(r));
  colHeads.forEach((h, c) => fz.decorate(h, c, -1, true));
  addResizers(colHeads, {
    view, apply: () => { applyWidths(); fz.layout(); },
    columnTexts: (c) => Array.from({ length: rows }, (_, r) => opts.getDisplay(keyOf(c, r))),
  });
  const ctl = createFilterCtl(root, colHeads, rows, view, (c, r) => opts.getDisplay(keyOf(c, r)), () => {
    if (ctl.hidden(active.row)) { active = { col: active.col, row: stepRow(ctl.order(), active.row, 1, rows, false) }; anchor = active; }
    fz.layout();
    render();
  });
  fz.layout();
  const win = createRowWindow(root, cols, rows, (k, el) => {
    const p = parseKey(k);
    fz.decorate(el, p.col, p.row);
    opts.onCellCreated?.(k, el);
  });
  const cells = win.cells;

  const sigs = new Map<string, string>();

  /** Render one cell (hook element if provided, else text); skips the DOM write when unchanged. */
  function paint(key: string): void {
    const el = cells.get(key);
    if (!el) return;
    const custom = opts.renderCell?.(key) ?? null;
    const text = custom ? "" : opts.getDisplay(key);
    const sig = custom ? `h:${custom.outerHTML}` : `t:${text}`;
    if (sigs.get(key) === sig) return;
    sigs.set(key, sig);
    markKind(el, text);
    if (custom) el.replaceChildren(custom);
    else el.textContent = text;
  }

  const clamp = (p: Pos): Pos => ({
    col: Math.max(0, Math.min(cols - 1, p.col)),
    row: Math.max(0, Math.min(rows - 1, p.row)),
  });

  const selection = (): string => {
    const a = keyOf(anchor.col, anchor.row), b = keyOf(active.col, active.row);
    if (a === b) return a;
    const k = rangeKeys(anchor, active);
    return `${k[0]}:${k[k.length - 1]}`;
  };

  /** Re-apply highlight classes on rendered cells/headers only. */
  const mark = (): void => { marked = markSelection(marked, { cells, rowHeads: win.heads, colHeads }, anchor, active); };

  /** Recompute the rendered row window; paint new rows, forget removed ones. */
  function sync(): void {
    const order = ctl.order();
    const { added, removed } = win.sync(editor ? active.row : undefined, order, fz.pinned(order));
    for (const r of removed) for (let c = 0; c < cols; c++) sigs.delete(keyOf(c, r));
    for (const r of added) {
      fz.decorate(win.heads.get(r)!, -1, r, true);
      for (let c = 0; c < cols; c++) paint(keyOf(c, r));
    }
    if (added.length || removed.length) mark();
  }

  /** Scroll the active cell into view (frozen panes aware), refresh the window and highlights, then notify. */
  function render(notify = true): void {
    fz.scrollRow(Math.max(0, ctl.index(active.row)));
    sync();
    mark();
    fz.scrollCol(active.col, cells.get(keyOf(active.col, active.row)));
    if (notify) opts.onSelect?.(selection());
  }

  /** Apply a keyboard navigation action (pure math in nav.ts) and re-render. */
  function nav(a: NavAction, extend = false): void {
    ({ anchor, active } = navigate(a, { anchor, active }, extend, {
      cols, rows, order: ctl.order(), page: pageRows(root.clientHeight || FALLBACK_VIEWPORT_H, ROW_H),
      filled: (c, r) => opts.getRaw(keyOf(c, r)) !== "",
    }));
    render();
  }

  /** Open the inline editor on the active cell. */
  function startEdit(initial?: string): void {
    if (editor) return;
    const key = keyOf(active.col, active.row);
    sigs.delete(key);
    editor = openEditor(cells.get(key)!, initial ?? opts.getRaw(key), initial !== undefined,
      { end: endEdit, move: (dc, dr) => nav({ kind: "move", dc, dr }), commitAll: () => endEdit(true, true, true) });
  }

  /** Close the editor; commit when `commit` (into the whole selection when `all`), refocus the grid when `refocus` (not on blur). */
  function endEdit(commit: boolean, refocus = true, all = false): void {
    if (!editor) return;
    const { input } = editor;
    editor = null;
    const key = keyOf(active.col, active.row);
    for (const k of all ? rangeKeys(anchor, active) : [key]) { // Ctrl+Enter: refs shift from the active cell (Excel)
      const p = parseKey(k);
      if (commit) opts.onEdit(k, shiftFormula(input.value, p.col - active.col, p.row - active.row)); paint(k);
    }
    if (refocus) root.focus();
  }

  bindKeys(root, {
    busy: () => !!editor, nav, startEdit, sheet: (d) => opts.onSheetStep?.(d),
    clear: () => rangeKeys(anchor, active).forEach((k) => { opts.onEdit(k, ""); paint(k); }),
    fill: (dir) => Object.entries(fillPlan(anchor, active, dir, opts.getRaw, ctl.hidden)).forEach(([k, v]) => { opts.onEdit(k, v); paint(k); }),
  });

  root.addEventListener("mousedown", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>(".dkg-cell");
    if (!t || (editor && t.contains(editor.input))) return;
    endEdit(true);
    active = parseKey(t.dataset.key!);
    if (!e.shiftKey) anchor = active;
    dragging = true;
    render();
    root.focus();
  });
  root.addEventListener("mouseover", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>(".dkg-cell");
    if (!dragging || !t) return;
    active = parseKey(t.dataset.key!);
    render();
  });
  const onMouseUp = (): void => { dragging = false; };
  document.addEventListener("mouseup", onMouseUp);
  root.addEventListener("dblclick", (e) => {
    if ((e.target as HTMLElement).closest(".dkg-cell")) startEdit();
  });

  bindClipboard(root, {
    sel: () => ({ anchor, active }), cols, rows, busy: () => !!editor, getRaw: opts.getRaw,
    put: (k, v) => { opts.onEdit(k, v); paint(k); },
    clear: () => rangeKeys(anchor, active).forEach((k) => { opts.onEdit(k, ""); paint(k); }),
  });

  root.addEventListener("scroll", sync);
  sync();
  render(false);
  return {
    refresh: (keys) => (keys ?? [...cells.keys()]).forEach(paint), // paint ignores unrendered keys
    select(key) {
      endEdit(true);
      const [a, b] = key.split(":");
      active = clamp(parseKey(b ?? a));
      anchor = b ? clamp(parseKey(a)) : active;
      render();
    },
    focus: () => root.focus(),
    destroy() {
      ctl.close();
      document.removeEventListener("mouseup", onMouseUp);
      editor = null;
      root.remove();
    },
    getSelection: selection,
  };
}
