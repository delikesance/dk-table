/** Creates toolbar, formula bar, sidebar and sheet tabs and wires them to the app handle. */
import { createToolbar, createFormulaBar } from "./toolbar";
import { createSheetTabs } from "./tabs/tabs";
import { createSidebar } from "./sidebar/sidebar";
import { FN_DOCS } from "./fndocs";
import { buildGrid, refreshTabs } from "./appGrid";
import { firstKey, type Ctx } from "./appState";

/** Build the chrome widgets into `root` and store them on `c` (needs `c.app` set). */
export function createWidgets(c: Ctx, root: HTMLElement): void {
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  const app = c.app;
  c.toolbar = createToolbar(q(".dk-app__top"), {
    onUndo: () => app.undo(), onRedo: () => app.redo(),
    onBold: () => app.style({ bold: !app.activeStyle().bold }),
    onItalic: () => app.style({ italic: !app.activeStyle().italic }),
    onAlign: (align) => app.style({ align }),
    onFormat: () => {},
    onFill: (fill) => app.style({ fill }),
    onOpen: () => app.hooks.command?.("open"),
    onSave: () => app.hooks.command?.("save"),
  });
  c.fbar = createFormulaBar(q(".dk-app__top"), {
    onGoto: (t) => c.grid.select(t.split(":")[0]),
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
      refreshTabs(c);
    },
    onDelete: (id) => {
      if (c.entries.length < 2) return;
      c.entries = c.entries.filter((x) => x.id !== id);
      if (c.cur.id === id) { c.cur = c.entries[0]; buildGrid(c); }
      refreshTabs(c);
    },
    onReorder: (ids) => { c.entries = ids.map((i) => c.entries.find((e) => e.id === i)!).filter(Boolean); },
  });
}
