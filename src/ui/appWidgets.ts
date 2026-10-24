/** Creates toolbar, formula bar, sidebar and sheet tabs and wires them to the app handle. */
import { createToolbar, createFormulaBar } from "./toolbar";
import { createSheetTabs } from "./tabs/tabs";
import { createSidebar } from "./sidebar/sidebar";
import { FN_DOCS } from "./fndocs";
import { buildGrid, refreshTabs } from "./appGrid";
import { firstKey, relink, type Ctx } from "./appState";
import { exportCsv, importCsv, newDocument, saveFile } from "./fileops";
import { floatingAction, installFloating } from "./appFloating";
import { autosum } from "./autosum";
import { createToolsToggle, installToolsToggle } from "./appTools";

/** Build the chrome widgets into `root` and store them on `c` (needs `c.app` set). */
export function createWidgets(c: Ctx, root: HTMLElement): void {
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  const app = c.app;
  const toggle = createToolsToggle();
  q(".dk-app__bar").append(toggle);
  c.toolbar = createToolbar(q(".dk-app__tools"), {
    onUndo: () => app.undo(), onRedo: () => app.redo(),
    onBold: () => app.style({ bold: !app.activeStyle().bold }),
    onItalic: () => app.style({ italic: !app.activeStyle().italic }),
    onUnderline: () => app.style({ underline: !app.activeStyle().underline }),
    onWrap: () => app.style({ wrap: !app.activeStyle().wrap }),
    onBorders: (mode) => app.borders(mode),
    onAlign: (align) => app.style({ align }),
    onFormat: (format) => app.style({ format }),
    onSort: (desc) => void app.sortColumn(desc),
    onSum: () => void autosum(app),
    onFill: (fill) => app.style({ fill: fill ?? undefined }),
    onTextColor: (color) => app.style({ color: color ?? undefined }),
    onOpen: () => app.hooks.command?.("open"),
    onSave: () => app.hooks.command?.("save"),
    menus: {
      onNew: () => newDocument(app),
      recents: () => app.recents(),
      onOpenRecent: (p) => app.hooks.command?.(`recent:${p}`),
      onOpen: () => app.hooks.command?.("open"),
      onSave: () => app.hooks.command?.("save"),
      onSaveAs: () => void saveFile(app, true),
      onImportCsv: () => void importCsv(app),
      onExportCsv: () => void exportCsv(app),
    },
  });
  c.fbar = createFormulaBar(q(".dk-app__bar"), {
    onGoto: (t) => { c.grid.select(t.split(":")[0]); c.grid.focus(); },
    onCommit: (raw) => app.edit(firstKey(c), raw),
  });
  c.sidebar = createSidebar(q(".dk-app__main"), {
    functions: FN_DOCS,
    onInsert: (n) => app.insertFunction(n),
    onOpenRecent: (p) => app.hooks.command?.(`recent:${p}`),
  });
  c.tabs = createSheetTabs(q(".dk-app__tabs"), {
    onAdd: () => app.addSheet(),
    onSwitch: (id) => app.switchSheet(id),
    onRename: (id, name) => {
      const e = c.entries.find((x) => x.id === id);
      if (e) e.name = name;
      relink(c); c.grid.refresh();
      refreshTabs(c);
    },
    onDelete: (id) => {
      if (c.entries.length < 2) return;
      c.entries = c.entries.filter((x) => x.id !== id);
      relink(c);
      if (c.cur.id === id) { c.cur = c.entries[0]; buildGrid(c); } else c.grid.refresh();
      refreshTabs(c);
    },
    onReorder: (ids) => { c.entries = ids.map((i) => c.entries.find((e) => e.id === i)!).filter(Boolean); },
  });
  installFloating(c, root, (id) => floatingAction(app, id));
  installToolsToggle(root, toggle);
}
