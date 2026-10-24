/**
 * Spreadsheet grid component: headers, selection, inline editing, TSV copy/paste.
 * 26x100 = 2600 plain divs in a CSS grid (sticky headers); refresh() touches only given cells.
 */
import { colName, keyOf, parseKey, rangeKeys, type Pos } from "./keys";
import { bindClipboard } from "./clipboard";
import type { Grid, GridOptions } from "./types";

export type { Grid, GridOptions } from "./types";

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

/** Build the grid inside `host` and return its API. */
export function createGrid(host: HTMLElement, opts: GridOptions): Grid {
  const { cols, rows } = opts;
  let anchor: Pos = { col: 0, row: 0 };
  let active: Pos = { col: 0, row: 0 };
  let editor: { input: HTMLInputElement; typed: boolean } | null = null;
  let dragging = false;
  let marked: HTMLElement[] = [];
  const cells = new Map<string, HTMLElement>();
  const colHeads: HTMLElement[] = [];
  const rowHeads: HTMLElement[] = [];

  const root = document.createElement("div");
  root.className = "dkg";
  root.tabIndex = 0;
  root.style.gridTemplateColumns = `var(--row-header-w) repeat(${cols}, var(--cell-w))`;
  const mk = (cls: string, text = "") => {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    root.appendChild(d);
    return d;
  };
  mk("dkg-corner");
  for (let c = 0; c < cols; c++) colHeads.push(mk("dkg-colh", colName(c)));
  for (let r = 0; r < rows; r++) {
    rowHeads.push(mk("dkg-rowh", String(r + 1)));
    for (let c = 0; c < cols; c++) {
      const el = mk("dkg-cell");
      el.dataset.key = keyOf(c, r);
      cells.set(el.dataset.key, el);
    }
  }
  host.appendChild(root);

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

  /** Update highlight classes and notify. */
  function render(notify = true): void {
    marked.forEach((e) => e.classList.remove("dkg-active", "dkg-range", "dkg-on"));
    marked = [];
    const mark = (e: HTMLElement | undefined, cls: string) => {
      if (!e) return;
      e.classList.add(cls);
      marked.push(e);
    };
    const multi = anchor.col !== active.col || anchor.row !== active.row;
    if (multi) rangeKeys(anchor, active).forEach((k) => mark(cells.get(k), "dkg-range"));
    const ak = keyOf(active.col, active.row);
    mark(cells.get(ak), "dkg-active");
    mark(colHeads[active.col], "dkg-on");
    mark(rowHeads[active.row], "dkg-on");
    (cells.get(ak) as HTMLElement & { scrollIntoView?: Function })?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (notify) opts.onSelect?.(selection());
  }

  /** Move the cursor (extending the range when `extend`). */
  function move(dc: number, dr: number, extend = false, jump = false): void {
    active = clamp(jump ? { col: dc ? (dc < 0 ? 0 : cols - 1) : active.col, row: dr ? (dr < 0 ? 0 : rows - 1) : active.row }
      : { col: active.col + dc, row: active.row + dr });
    if (!extend) anchor = active;
    render();
  }

  /** Open the inline editor on the active cell. */
  function startEdit(initial?: string): void {
    if (editor) return;
    const key = keyOf(active.col, active.row);
    const el = cells.get(key)!;
    const input = document.createElement("input");
    input.className = "dkg-editor";
    input.value = initial ?? opts.getRaw(key);
    sigs.delete(key);
    el.replaceChildren(input);
    editor = { input, typed: initial !== undefined };
    input.addEventListener("keydown", onEditorKey);
    input.focus();
    if (initial === undefined) input.select();
  }

  /** Close the editor; commit the value when `commit`. */
  function endEdit(commit: boolean): void {
    if (!editor) return;
    const { input } = editor;
    editor = null;
    const key = keyOf(active.col, active.row);
    if (commit) opts.onEdit(key, input.value);
    paint(key);
    root.focus();
  }

  function onEditorKey(e: KeyboardEvent): void {
    e.stopPropagation();
    const m = MOVES[e.key];
    if (e.key === "Escape") { e.preventDefault(); endEdit(false); }
    else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      endEdit(true);
      move(e.key === "Tab" ? (e.shiftKey ? -1 : 1) : 0, e.key === "Enter" ? (e.shiftKey ? -1 : 1) : 0);
    } else if (m && editor?.typed) { e.preventDefault(); endEdit(true); move(m[0], m[1]); }
  }

  root.addEventListener("keydown", (e) => {
    if (editor) return;
    const m = MOVES[e.key];
    if (m) { e.preventDefault(); move(m[0], m[1], e.shiftKey, e.ctrlKey || e.metaKey); }
    else if (e.key === "Tab") { e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === "Enter") { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
    else if (e.key === "F2") { e.preventDefault(); startEdit(); }
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      rangeKeys(anchor, active).forEach((k) => { opts.onEdit(k, ""); paint(k); });
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(e.key); }
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
  document.addEventListener("mouseup", () => { dragging = false; });
  root.addEventListener("dblclick", (e) => {
    if ((e.target as HTMLElement).closest(".dkg-cell")) startEdit();
  });

  bindClipboard(root, {
    sel: () => ({ anchor, active }), cols, rows, busy: () => !!editor, getRaw: opts.getRaw,
    put: (k, v) => { opts.onEdit(k, v); paint(k); },
  });

  cells.forEach((_, k) => paint(k));
  render(false);
  return {
    refresh: (keys) => (keys ?? [...cells.keys()]).forEach(paint),
    select(key) {
      endEdit(true);
      active = anchor = clamp(parseKey(key));
      render();
    },
    getSelection: selection,
  };
}
