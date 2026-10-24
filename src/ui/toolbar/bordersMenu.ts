/** « Bordures » toolbar dropdown: one icon button opening a one-level menu (Toutes, Contour, Bas, Aucune). */
import { icon } from "../icons";
import { BORDER_LABELS, type BorderMode } from "../borders";

/** Icon shown next to each border mode. */
const ICONS: Record<BorderMode, string> = { all: "borders-all", outer: "borders", bottom: "borders-bottom", none: "borders-none" };

/**
 * Builds the dropdown; picking an item closes the menu and calls `onPick(mode)`.
 * Keyboard: ArrowUp/Down move, Escape closes and refocuses the trigger; an outside mousedown closes it.
 */
export function createBordersControl(onPick: (mode: BorderMode) => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "dk-colorwrap dk-borders";
  const trigger = document.createElement("button");
  trigger.type = "button"; trigger.className = "dk-iconbtn"; trigger.dataset.action = "borders";
  trigger.setAttribute("aria-label", "Bordures"); trigger.title = "Bordures"; trigger.innerHTML = icon("borders");
  trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false");
  const list = document.createElement("div");
  list.className = "dk-menu__list"; list.setAttribute("role", "menu"); list.setAttribute("aria-label", "Bordures");
  list.hidden = true;
  const items = BORDER_LABELS.map(([mode, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "dk-menu__item"; b.setAttribute("role", "menuitem"); b.setAttribute("aria-label", label); b.tabIndex = -1;
    b.innerHTML = `${icon(ICONS[mode])}<span class="dk-menu__label">${label}</span>`;
    b.addEventListener("click", () => { close(); onPick(mode); });
    return b;
  });
  list.append(...items);

  /** Hides the menu. */
  function close(): void { list.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  trigger.addEventListener("click", () => {
    if (!list.hidden) return close();
    list.hidden = false; trigger.setAttribute("aria-expanded", "true"); items[0].focus();
  });
  list.addEventListener("keydown", (e) => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const to = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (e.key === "ArrowDown") to(i + 1);
    else if (e.key === "ArrowUp") to(i - 1);
    else if (e.key === "Escape") { e.preventDefault(); close(); trigger.focus(); }
  });
  document.addEventListener("mousedown", (e) => { if (!list.hidden && !wrap.contains(e.target as Node)) close(); });
  wrap.append(trigger, list);
  return wrap;
}
