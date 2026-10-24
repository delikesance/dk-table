/**
 * Macro wiring: palette commands (editor + one per macro) and Alt+F11. The Lua VM and the
 * editor are loaded on first use (`./kit`) to keep startup light.
 */
import { registerCommand } from "../palette/registry";
import type { MacroPanel } from "./panel";
import type { RunResult } from "../../macros/lua";
import type { App } from "../appTypes";

/** Lazy macro UI handle. */
export interface MacroUi {
  open(id?: string): Promise<void>;
  /** Run a macro; errors open the panel on it. */
  run(id: string): Promise<RunResult>;
}

/** Register macro commands and return the lazy UI; the panel is created in `host` on first use. */
export function installMacros(app: App, host: HTMLElement): MacroUi {
  let kit: Promise<{ panel: MacroPanel; run: (id: string) => RunResult }> | undefined;
  const load = () => (kit ??= import("./kit").then((k) => ({
    panel: k.createMacroPanel(host, { store: app.macros, run: (id) => k.runAppMacro(app, id) }),
    run: (id: string) => k.runAppMacro(app, id),
  })));
  const ui: MacroUi = {
    open: async (id) => (await load()).panel.open(id),
    async run(id) {
      const k = await load();
      const r = k.run(id);
      k.panel.report(id, r);
      return r;
    },
  };
  registerCommand({ id: "macros.editor", label: "Éditeur de macros", shortcut: "Alt+F11",
    keywords: ["lua", "script"], run: () => void ui.open() });
  let unregister: (() => void)[] = [];
  const sync = () => {
    unregister.forEach((u) => u());
    unregister = app.macros.list().map((m) => registerCommand({
      id: `macro.run.${m.id}`, label: `Macro : ${m.name}`, keywords: ["lua", "script", "exécuter"],
      run: () => void ui.run(m.id),
    }));
  };
  app.macros.onChange(sync);
  sync();
  document.addEventListener("keydown", (e) => {
    if (!e.altKey || e.key !== "F11") return;
    e.preventDefault();
    void load().then(({ panel }) => (panel.isOpen() ? panel.close() : panel.open()));
  });
  return ui;
}
