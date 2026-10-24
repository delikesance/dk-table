/** App shell: layout + wiring of grid, engine, toolbar, tabs, sidebar, palette. */
import "../styles/tokens.css";
import "../styles/components.css";
import "./app.css";
import "./grid/grid.css";
import { getDisplay, getRaw, setCell } from "../engine/sheet";
import { registerLive } from "../engine/live/adapter";
import { createGrid, type Grid } from "./grid/grid";
import { parseKey, rangeKeys } from "./grid/keys";
import { createToolbar, createFormulaBar, type Toolbar, type FormulaBar } from "./toolbar";
import { createSheetTabs, type SheetTabs } from "./tabs/tabs";
import { createRecents } from "../io/recents";
import { createSidebar, type Sidebar, type RecentFile } from "./sidebar/sidebar";
import { createPalette } from "./palette/palette";
import { FN_DOCS } from "./fndocs";
import { newEntry, pushUndo, step, type Entry } from "./model";
import { liveCell, paintStyle as paintCell } from "./cellview";
import { installCommands } from "./commands";
import type { App } from "./appTypes";

export type { App, Hooks } from "./appTypes";

const LAYOUT =
  '<div class="dk-app"><div class="dk-app__top"></div>' +
  '<div class="dk-app__main"><div class="dk-app__grid"></div></div>' +
  '<div class="dk-app__tabs"></div></div>';

/** Mount the whole application into `root`. */
export function mount(root: HTMLElement): App {
  registerLive();
  root.innerHTML = LAYOUT;
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  const gridHost = q(".dk-app__grid");
  let entries: Entry[] = [newEntry("Feuille 1")];
  let cur = entries[0];
  let grid: Grid;
  const store = createRecents(typeof localStorage === "undefined" ? null : localStorage, 8);
  const toRecent = (path: string): RecentFile => ({ path, name: path.split(/[\\/]/).pop() ?? path });
  let recents: RecentFile[] = store.list().map(toRecent);
  let coalescing = false;

  const keysOf = (sel: string): string[] => {
    const [a, b = a] = sel.split(":");
    return rangeKeys(parseKey(a), parseKey(b));
  };
  const first = (): string => grid.getSelection().split(":")[0];
  const setTitle = (dirty: boolean): void => {
    document.title = `${app.path?.split(/[\\/]/).pop() ?? "Sans titre"}${dirty ? " •" : ""} — dk-table`;
  };

  const paintStyle = (key: string): void => paintCell(gridHost, key, cur.styles[key]);

  /** Sync formula bar, sidebar info and toolbar state with the active cell. */
  const syncInfo = (): void => {
    const key = first();
    const raw = getRaw(cur.sheet, key);
    fbar.setCell(key, raw);
    sidebar.setCellInfo({ ref: key, raw, display: getDisplay(cur.sheet, key), format: "Standard" });
    const st = cur.styles[key] ?? {};
    toolbar.setState({ bold: !!st.bold, italic: !!st.italic, align: st.align ?? "left",
      canUndo: cur.undo.length > 0, canRedo: cur.redo.length > 0 });
  };

  /** After a data change: redraw all cells (dependents) and mark modified. */
  const touch = (): void => {
    setTitle(true);
    grid.refresh();
    syncInfo();
  };

  /** Rebuild the grid for the current sheet. */
  const buildGrid = (): void => {
    gridHost.replaceChildren();
    grid = createGrid(gridHost, {
      cols: cur.sheet.cols, rows: cur.sheet.rows,
      getDisplay: (k) => getDisplay(cur.sheet, k),
      getRaw: (k) => getRaw(cur.sheet, k),
      onEdit: (k, raw) => {
        if (!coalescing) {
          pushUndo(cur);
          coalescing = true;
          queueMicrotask(() => { coalescing = false; touch(); });
        }
        setCell(cur.sheet, k, raw);
      },
      onSelect: () => syncInfo(),
      renderCell: (k) => liveCell(cur.sheet, k),
    });
    Object.keys(cur.styles).forEach(paintStyle);
    gridHost.querySelector(".dkg")?.addEventListener("contextmenu", (e) => app.hooks.context?.(e as MouseEvent));
    syncInfo();
  };

  const refreshTabs = (): void => {
    tabs.setSheets(entries.map(({ id, name }) => ({ id, name })));
    tabs.setActive(cur.id);
  };

  const app: App = {
    hooks: {},
    path: undefined,
    edit(key, raw) {
      pushUndo(cur);
      setCell(cur.sheet, key, raw);
      touch();
    },
    undo() { if (step(cur, "undo")) { buildGrid(); setTitle(true); } },
    redo() { if (step(cur, "redo")) { buildGrid(); setTitle(true); } },
    addSheet() {
      cur = newEntry(`Feuille ${entries.length + 1}`);
      entries.push(cur);
      refreshTabs(); buildGrid(); setTitle(true);
    },
    switchSheet(id) {
      const e = entries.find((x) => x.id === id);
      if (!e || e === cur) return;
      cur = e; refreshTabs(); buildGrid();
    },
    sheets: () => entries.map(({ id, name }) => ({ id, name })),
    activeDoc: () => ({ id: cur.id, name: cur.name, cols: cur.sheet.cols, rows: cur.sheet.rows, cells: cur.sheet.cells }),
    toDoc: () => ({
      version: 1, active: cur.id,
      sheets: entries.map((e) => ({ id: e.id, name: e.name, cols: e.sheet.cols, rows: e.sheet.rows,
        cells: JSON.parse(JSON.stringify(e.sheet.cells)) })),
    }),
    loadDoc(doc, path) {
      entries = doc.sheets.map((s) => newEntry(s.name, s));
      cur = entries.find((e) => e.id === doc.active) ?? entries[0];
      app.path = path;
      refreshTabs(); buildGrid(); setTitle(false);
    },
    importSheet(name, sheet) {
      cur = newEntry(name, sheet);
      entries.push(cur);
      refreshTabs(); buildGrid(); setTitle(true);
    },
    selection: () => grid.getSelection(),
    selectedKeys: () => keysOf(grid.getSelection()),
    select: (k) => grid.select(k),
    style(patch) {
      for (const k of keysOf(grid.getSelection())) { cur.styles[k] = { ...cur.styles[k], ...patch }; paintStyle(k); }
      syncInfo();
    },
    activeStyle: () => cur.styles[first()] ?? {},
    toggleSidebar: () => sidebar.toggle(),
    insertFunction(name) {
      const raw = getRaw(cur.sheet, first());
      app.edit(first(), raw.startsWith("=") ? `${raw}${name}(` : `=${name}(`);
    },
    recents: () => recents,
    addRecent(path) {
      store.add(path);
      recents = store.list().map(toRecent);
      sidebar.setRecent(recents);
    },
    markSaved: () => setTitle(false),
  };

  const toolbar: Toolbar = createToolbar(q(".dk-app__top"), {
    onUndo: () => app.undo(), onRedo: () => app.redo(),
    onBold: () => app.style({ bold: !app.activeStyle().bold }),
    onItalic: () => app.style({ italic: !app.activeStyle().italic }),
    onAlign: (align) => app.style({ align }),
    onFormat: () => {},
    onFill: (fill) => app.style({ fill }),
    onOpen: () => app.hooks.command?.("open"),
    onSave: () => app.hooks.command?.("save"),
  });
  const fbar: FormulaBar = createFormulaBar(q(".dk-app__top"), {
    onGoto: (t) => grid.select(t.split(":")[0]),
    onCommit: (raw) => app.edit(first(), raw),
  });
  const sidebar: Sidebar = createSidebar(q(".dk-app__main"), {
    functions: FN_DOCS,
    onInsert: (n) => app.insertFunction(n),
    onOpenRecent: (p) => app.hooks.command?.(`recent:${p}`),
  });
  const tabs: SheetTabs = createSheetTabs(q(".dk-app__tabs"), {
    onAdd: () => app.addSheet(),
    onSwitch: (id) => app.switchSheet(id),
    onRename: (id, name) => {
      const e = entries.find((x) => x.id === id);
      if (e) e.name = name;
      refreshTabs();
    },
    onDelete: (id) => {
      if (entries.length < 2) return;
      entries = entries.filter((x) => x.id !== id);
      if (cur.id === id) { cur = entries[0]; buildGrid(); }
      refreshTabs();
    },
    onReorder: (ids) => { entries = ids.map((i) => entries.find((e) => e.id === i)!).filter(Boolean); },
  });
  createPalette({ hotkey: true });
  sidebar.setRecent(recents);
  refreshTabs();
  buildGrid();
  installCommands(app);
  return app;
}
