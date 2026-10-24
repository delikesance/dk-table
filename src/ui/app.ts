/** App shell: layout + mount. State in appState, grid in appGrid, API in appApi, widgets in appWidgets. */
import "../styles/tokens.css";
import "../styles/components.css";
import "./app.css";
import "./grid/grid.css";
import { registerLive } from "../engine/live/adapter";
import { createPalette } from "./palette/palette";
import { newEntry } from "./model";
import { destroyMenus } from "./toolbar/menus";
import { installCommands } from "./commands";
import { installUnloadGuard } from "./fileops";
import { buildGrid, refreshTabs } from "./appGrid";
import { createApi } from "./appApi";
import { createWidgets } from "./appWidgets";
import { installMacros } from "./macros/wire";
import type { Ctx } from "./appState";
import type { App } from "./appTypes";

export type { App, Hooks } from "./appTypes";

const LAYOUT =
  '<div class="dk-app dk-app--minimal"><div class="dk-app__top"><div class="dk-app__bar"></div><div class="dk-app__tools"></div></div>' +
  '<div class="dk-app__main"><div class="dk-app__grid"></div></div>' +
  '<div class="dk-app__tabs"></div></div>';

/** Disposer of the previous mount (palette hotkey, menus click listener), run before a remount. */
let disposePrev: (() => void) | undefined;

/** Mount the whole application into `root`; global listeners of a previous mount are released first. */
export function mount(root: HTMLElement): App {
  disposePrev?.();
  registerLive();
  root.innerHTML = LAYOUT;
  const first = newEntry("Feuille 1");
  // grid/widgets/app are assigned right below, before any use.
  const c = {
    gridHost: root.querySelector<HTMLElement>(".dk-app__grid")!,
    entries: [first], cur: first, recents: [], coalescing: false,
  } as unknown as Ctx;
  c.app = createApi(c);
  createWidgets(c, root);
  c.macroUi = installMacros(c.app, root.querySelector<HTMLElement>(".dk-app__main")!);
  c.sidebar.setRecent(c.recents);
  const palette = createPalette({ hotkey: true });
  const menus = root.querySelector<HTMLElement>(".dk-menus");
  disposePrev = () => { palette.destroy(); destroyMenus(menus); };
  refreshTabs(c);
  buildGrid(c);
  installCommands(c.app);
  installUnloadGuard(c.app);
  return c.app;
}
