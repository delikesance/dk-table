/** Minimal-mode toggle: the base bar (N1) is always visible; one discreet button deploys/hides the N2 extras + sidebar. */
import { icon } from "./icons";
import type { KeyValueStore } from "../io/recents";

const KEY = "dk-table.tools";
/** Fixed accessible name + tooltip; state is conveyed by aria-expanded. */
const LABEL = "Outils (Ctrl+J)";

/** Default store: localStorage when available, else null (memory only). */
function defaultStore(): KeyValueStore | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

/** Create the discreet disclosure button placed at the start of the top bar. */
export function createToolsToggle(): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button"; b.className = "dk-iconbtn dk-toolstoggle"; b.dataset.action = "toggle-tools";
  b.setAttribute("aria-label", LABEL); b.title = LABEL;
  b.setAttribute("aria-expanded", "false"); b.innerHTML = `<span>Outils</span>${icon("tools")}`;
  return b;
}

/**
 * Wire the toggle: N2 (`.dk-toolbar__n2`) and sidebar (`.dk-sidebar`) start hidden;
 * each click flips them together and updates aria/title + the `dk-app--minimal` class.
 * The state is persisted under `dk-table.tools` ("1" = deployed) in `store` and restored at install (default hidden).
 * Returns a setter so other code (palette, shortcuts) can drive the same state.
 */
export function installToolsToggle(
  root: HTMLElement, btn: HTMLButtonElement, store: KeyValueStore | null = defaultStore(),
): (open: boolean) => void {
  const app = root.querySelector<HTMLElement>(".dk-app")!;
  const tools = root.querySelector<HTMLElement>(".dk-toolbar__n2")!;
  const side = root.querySelector<HTMLElement>(".dk-sidebar")!;
  const set = (open: boolean) => {
    tools.hidden = !open; side.hidden = !open;
    app.classList.toggle("dk-app--minimal", !open);
    btn.setAttribute("aria-expanded", String(open));
    btn.classList.toggle("dk-toolstoggle--open", open);
    try { store?.setItem(KEY, open ? "1" : "0"); } catch { /* storage unavailable: memory only */ }
  };
  btn.addEventListener("click", () => set(Boolean(tools.hidden)));
  let saved = false;
  try { saved = store?.getItem(KEY) === "1"; } catch { /* ignore */ }
  set(saved);
  return set;
}
