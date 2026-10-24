/** Minimal-mode toggle: by default only the sheet is visible; one discreet button deploys/hides toolbar + sidebar. */
import { icon } from "./icons";

/** Create the discreet disclosure button placed at the start of the top bar. */
export function createToolsToggle(): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button"; b.className = "dk-iconbtn dk-toolstoggle"; b.dataset.action = "toggle-tools";
  b.setAttribute("aria-label", "Afficher les outils"); b.title = "Afficher les outils";
  b.setAttribute("aria-expanded", "false"); b.innerHTML = icon("tools");
  return b;
}

/**
 * Wire the toggle: tools (`.dk-app__tools`) and sidebar (`.dk-sidebar`) start hidden;
 * each click flips them together and updates aria/title + the `dk-app--minimal` class.
 * Returns a setter so other code (palette, shortcuts) can drive the same state.
 */
export function installToolsToggle(root: HTMLElement, btn: HTMLButtonElement): (open: boolean) => void {
  const app = root.querySelector<HTMLElement>(".dk-app")!;
  const tools = root.querySelector<HTMLElement>(".dk-app__tools")!;
  const side = root.querySelector<HTMLElement>(".dk-sidebar")!;
  const set = (open: boolean) => {
    tools.hidden = !open; side.hidden = !open;
    app.classList.toggle("dk-app--minimal", !open);
    const label = open ? "Masquer les outils" : "Afficher les outils";
    btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-label", label); btn.title = label;
    btn.classList.toggle("dk-toolstoggle--open", open);
  };
  btn.addEventListener("click", () => set(Boolean(tools.hidden)));
  set(false);
  return set;
}
