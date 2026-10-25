/** Macro editor tabs in the app shell: a macro opens full screen in place of the grid, like a document. */
import { refreshTabs } from "./appGrid";
import { leaveDoc } from "./appDocs";
import type { Ctx } from "./appState";

/** Show the grid or hide it behind another view, and tell the grid about it. */
function showGrid(c: Ctx, shown: boolean): void {
  c.gridHost.hidden = !shown;
  c.gridHost.dispatchEvent(new Event("dk-visibility"));
}

/**
 * Open the editor tab of macro `id` full screen (adds the tab when needed). The Lua editor is loaded on
 * first use; the view switches at once.
 */
export async function openMacroView(c: Ctx, id: string): Promise<void> {
  if (!c.app.macros.get(id)) return;
  leaveDoc(c); // also closes another macro editor and brings the grid back
  c.curMacro = id;
  if (!c.macroTabs.includes(id)) c.macroTabs.push(id);
  showGrid(c, false);
  c.macroHost.hidden = false;
  refreshTabs(c);
  const k = await import("./macros/kit");
  if (c.curMacro !== id || c.macroView) return; // closed or replaced while loading
  c.macroView = k.createMacroView(c.macroHost, { store: c.app.macros, id, run: () => k.runAppMacro(c.app, id) });
  c.macroView.focus();
}

/** Close the macro editor view (the tab stays); returns true when one was open. No tab refresh (callers do it). */
export function leaveMacro(c: Ctx): boolean {
  if (!c.curMacro) return false;
  c.macroView?.destroy();
  c.macroView = undefined;
  c.curMacro = undefined;
  c.macroHost.replaceChildren();
  c.macroHost.hidden = true;
  showGrid(c, true);
  return true;
}

/** Close the editor tab of macro `id`; the macro itself is kept. */
export function closeMacroTab(c: Ctx, id: string): void {
  c.macroTabs = c.macroTabs.filter((t) => t !== id);
  if (c.curMacro === id) leaveMacro(c);
  refreshTabs(c);
}

/** Keep the macro tabs in step with the store: removed macros lose their tab, renamed ones are relabelled. */
export function watchMacros(c: Ctx): void {
  const sig = () => c.macroTabs.map((id) => `${id}:${c.app.macros.get(id)?.name}`).join("|");
  let last = sig();
  c.leaveMacro = () => leaveMacro(c);
  c.app.macros.onChange(() => {
    const gone = c.macroTabs.filter((id) => !c.app.macros.get(id));
    c.macroTabs = c.macroTabs.filter((id) => !gone.includes(id));
    if (c.curMacro && gone.includes(c.curMacro)) leaveMacro(c);
    const now = sig();
    if (now !== last || gone.length) refreshTabs(c);
    last = now;
  });
}
