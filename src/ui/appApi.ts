/** Builds the public `App` handle (edit, undo, sheets, docs, styles, recents) over the shared `Ctx`. */
import { getRaw, setCell } from "../engine/sheet";
import { newEntry, pushUndo, step, type Entry } from "./model";
import { paintStyle } from "./cellview";
import { buildGrid, refreshTabs, syncInfo, touch } from "./appGrid";
import { firstKey, keysOf, setTitle, type Ctx } from "./appState";
import { createRecents } from "../io/recents";
import type { RecentFile } from "./sidebar/sidebar";
import type { DocSheet } from "../io/types";
import type { App } from "./appTypes";

/** Styles map for persistence: a copy, or undefined when empty (keeps files lean). */
const stylesOf = (styles: Entry["styles"]): DocSheet["styles"] =>
  Object.keys(styles).length ? structuredClone(styles) : undefined;

const toRecent = (path: string): RecentFile => ({ path, name: path.split(/[\\/]/).pop() ?? path });

/** Create the App handle; widgets are read lazily from `c` so order of creation is free. */
export function createApi(c: Ctx): App {
  const store = createRecents(typeof localStorage === "undefined" ? null : localStorage, 8);
  c.recents = store.list().map(toRecent);
  const paint = (k: string): void => paintStyle(c.gridHost, k, c.cur.styles[k]);
  const app: App = {
    hooks: {},
    path: undefined,
    edit(key, raw) {
      pushUndo(c.cur);
      setCell(c.cur.sheet, key, raw);
      touch(c);
    },
    undo() { if (step(c.cur, "undo")) { buildGrid(c); setTitle(c, true); } },
    redo() { if (step(c.cur, "redo")) { buildGrid(c); setTitle(c, true); } },
    addSheet() {
      c.cur = newEntry(`Feuille ${c.entries.length + 1}`);
      c.entries.push(c.cur);
      refreshTabs(c); buildGrid(c); setTitle(c, true);
    },
    switchSheet(id) {
      const e = c.entries.find((x) => x.id === id);
      if (!e || e === c.cur) return;
      c.cur = e; refreshTabs(c); buildGrid(c);
    },
    sheets: () => c.entries.map(({ id, name }) => ({ id, name })),
    activeDoc: () => ({ id: c.cur.id, name: c.cur.name, cols: c.cur.sheet.cols, rows: c.cur.sheet.rows, cells: c.cur.sheet.cells, styles: stylesOf(c.cur.styles) }),
    toDoc: () => ({
      version: 1, active: c.cur.id,
      sheets: c.entries.map((e) => ({ id: e.id, name: e.name, cols: e.sheet.cols, rows: e.sheet.rows,
        cells: JSON.parse(JSON.stringify(e.sheet.cells)), styles: stylesOf(e.styles) })),
    }),
    loadDoc(doc, path) {
      c.entries = doc.sheets.map((s) => newEntry(s.name, s));
      c.cur = c.entries.find((e) => e.id === doc.active) ?? c.entries[0];
      app.path = path;
      refreshTabs(c); buildGrid(c); setTitle(c, false);
    },
    importSheet(name, sheet) {
      c.cur = newEntry(name, sheet);
      c.entries.push(c.cur);
      refreshTabs(c); buildGrid(c); setTitle(c, true);
    },
    selection: () => c.grid.getSelection(),
    selectedKeys: () => keysOf(c.grid.getSelection()),
    select: (k) => c.grid.select(k),
    style(patch) {
      pushUndo(c.cur);
      for (const k of keysOf(c.grid.getSelection())) { c.cur.styles[k] = { ...c.cur.styles[k], ...patch }; paint(k); }
      setTitle(c, true); syncInfo(c);
    },
    activeStyle: () => c.cur.styles[firstKey(c)] ?? {},
    toggleSidebar: () => c.sidebar.toggle(),
    insertFunction(name) {
      const raw = getRaw(c.cur.sheet, firstKey(c));
      app.edit(firstKey(c), raw.startsWith("=") ? `${raw}${name}(` : `=${name}(`);
    },
    recents: () => c.recents,
    addRecent(path) {
      store.add(path);
      c.recents = store.list().map(toRecent);
      c.sidebar.setRecent(c.recents);
    },
    markSaved: () => setTitle(c, false),
  };
  return app;
}
