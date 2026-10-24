/** Builds the public `App` handle (edit, undo, sheets, docs, styles, recents) over the shared `Ctx`. */
import { getRaw, setCell } from "../engine/sheet";
import { batchEdit, newEntry, pushUndo, step, type Entry } from "./model";
import { createMacroStore } from "../macros/store";
import { buildGrid, paintKey, refreshCf, refreshTabs, syncInfo, touch } from "./appGrid";
import { firstKey, keysOf, relink, setTitle, type Ctx } from "./appState";
import { sortColumn } from "./sort";
import { createRecents } from "../io/recents";
import type { RecentFile } from "./sidebar/sidebar";
import type { DocSheet } from "../io/types";
import type { App } from "./appTypes";
import { setupAutosave } from "./autosaveUi";
import { fitColumns } from "./appFit";
import { colsOfSelection } from "./grid/fit";
import { structOp } from "./appStructure";
import { borderEdges } from "./borders";
import { addDoc, leaveDoc, openDocView, removeDoc, watchDocs } from "./appDocs";

/** Styles map for persistence: a copy, or undefined when empty (keeps files lean). */
const stylesOf = (styles: Entry["styles"]): DocSheet["styles"] =>
  Object.keys(styles).length ? structuredClone(styles) : undefined;

/** Build a recent-file entry (display name = basename) from a path. */
const toRecent = (path: string): RecentFile => ({ path, name: path.split(/[\\/]/).pop() ?? path });

/** Create the App handle; widgets are read lazily from `c` so order of creation is free. */
export function createApi(c: Ctx): App {
  const store = createRecents(typeof localStorage === "undefined" ? null : localStorage, 8);
  c.recents = store.list().map(toRecent);
  const macros = createMacroStore();
  let loading = false;
  const paint = (k: string): void => paintKey(c, k);
  const app: App = {
    hooks: {},
    path: undefined,
    edit(key, raw) {
      pushUndo(c.cur);
      setCell(c.cur.sheet, key, raw);
      touch(c);
    },
    editMany(cells) {
      pushUndo(c.cur);
      for (const [k, raw] of Object.entries(cells)) setCell(c.cur.sheet, k, raw);
      touch(c);
    },
    batch(fn) { if (batchEdit(c.cur, fn)) touch(c); },
    undo() { if (c.curDoc) { c.docEd?.undo(); return; } if (step(c.cur, "undo")) { relink(c); buildGrid(c); setTitle(c, true); } },
    redo() { if (c.curDoc) { c.docEd?.redo(); return; } if (step(c.cur, "redo")) { relink(c); buildGrid(c); setTitle(c, true); } },
    addSheet() {
      leaveDoc(c);
      c.cur = newEntry(`Feuille ${c.entries.length + 1}`);
      c.entries.push(c.cur);
      relink(c); refreshTabs(c); buildGrid(c); setTitle(c, true);
    },
    switchSheet(id) {
      const e = c.entries.find((x) => x.id === id);
      if (!e) return;
      const wasDoc = leaveDoc(c);
      if (e === c.cur) { if (wasDoc) refreshTabs(c); return; }
      c.cur = e; refreshTabs(c); buildGrid(c);
    },
    sheets: () => c.entries.map(({ id, name }) => ({ id, name })),
    activeDoc: () => ({ id: c.cur.id, name: c.cur.name, cols: c.cur.sheet.cols, rows: c.cur.sheet.rows, cells: c.cur.sheet.cells, styles: stylesOf(c.cur.styles) }),
    toDoc: () => ({
      version: 1, active: c.cur.id,
      sheets: c.entries.map((e) => ({ id: e.id, name: e.name, cols: e.sheet.cols, rows: e.sheet.rows,
        cells: JSON.parse(JSON.stringify(e.sheet.cells)), styles: stylesOf(e.styles),
        ...(e.freeze ? { freeze: { ...e.freeze } } : {}), ...(e.cf.length ? { cf: structuredClone(e.cf) } : {}) })),
      macros: macros.list().map((m) => ({ ...m })),
      ...(c.docs.toDocs() ? { docs: c.docs.toDocs() } : {}),
    }),
    loadDoc(doc, path) {
      leaveDoc(c);
      c.docs.load(doc.docs);
      c.entries = doc.sheets.map((s) => newEntry(s.name, s));
      c.cur = c.entries.find((e) => e.id === doc.active) ?? c.entries[0];
      app.path = path;
      loading = true; macros.load(doc.macros ?? []); loading = false;
      relink(c); refreshTabs(c); buildGrid(c); setTitle(c, false);
    },
    importSheet(name, sheet) {
      leaveDoc(c);
      c.cur = newEntry(name, sheet);
      c.entries.push(c.cur);
      relink(c); refreshTabs(c); buildGrid(c); setTitle(c, true);
    },
    selection: () => c.grid?.getSelection() ?? "A1", // the menu bar is built before the grid
    selectedKeys: () => keysOf(c.grid.getSelection()),
    select: (k) => c.grid.select(k),
    style(patch) {
      pushUndo(c.cur);
      for (const k of keysOf(c.grid.getSelection())) { c.cur.styles[k] = { ...c.cur.styles[k], ...patch }; paint(k); }
      c.grid.refresh();
      setTitle(c, true); syncInfo(c);
    },
    borders(mode) {
      pushUndo(c.cur);
      const st = c.cur.styles;
      for (const [k, b] of Object.entries(borderEdges(mode, keysOf(c.grid.getSelection()), (k) => st[k]?.borders))) {
        st[k] = { ...st[k], borders: b }; paint(k);
      }
      c.grid.refresh();
      setTitle(c, true); syncInfo(c);
    },
    activeStyle: () => c.cur.styles[firstKey(c)] ?? {},
    cfRules: () => structuredClone(c.cur.cf),
    setCfRules(rules) {
      pushUndo(c.cur);
      c.cur.cf = structuredClone(rules);
      refreshCf(c);
      setTitle(c, true); syncInfo(c);
    },
    toggleSidebar: () => c.sidebar.toggle(),
    insertFunction(name) {
      const key = firstKey(c);
      if (getRaw(c.cur.sheet, key) === "") app.edit(key, `=${name}()`);
    },
    recents: () => c.recents,
    addRecent(path) {
      store.add(path);
      c.recents = store.list().map(toRecent);
      c.sidebar.setRecent(c.recents);
    },
    markSaved: () => setTitle(c, false),
    insertRows: () => structOp(c, "insertRows"),
    deleteRows: () => structOp(c, "deleteRows"),
    insertCols: () => structOp(c, "insertCols"),
    deleteCols: () => structOp(c, "deleteCols"),
    setFreeze(f) {
      c.cur.freeze = f.rows > 0 || f.cols > 0 ? { rows: f.rows, cols: f.cols } : undefined;
      buildGrid(c); setTitle(c, true);
    },
    fitColumns: (cols) => fitColumns(c, cols ?? colsOfSelection(c.grid.getSelection())),
    getFreeze: () => ({ rows: c.cur.freeze?.rows ?? 0, cols: c.cur.freeze?.cols ?? 0 }),
    macros,
    addDoc: () => addDoc(c),
    openDoc: (id) => openDocView(c, id),
    removeDoc: (id) => removeDoc(c, id),
    activeDocId: () => c.curDoc,
    docEditor: () => c.docEd,
    sheetName: () => c.cur.name,
    runMacro: (id) => c.macroUi.run(id),
    openMacros: (id) => c.macroUi.open(id),
    sortColumn(desc) {
      if (!sortColumn(c.cur, firstKey(c), { desc })) return false;
      touch(c);
      return true;
    },
  };
  macros.onChange(() => { if (!loading) setTitle(c, true); });
  watchDocs(c);
  setupAutosave(c);
  return app;
}
