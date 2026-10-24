/** Generic context menu: `showContextMenu(x, y, items)`. */
import "./contextmenu.css";
import { icon } from "../icons";

/** A clickable entry. */
export interface MenuAction {
  label: string;
  /** Optional Iconoir name (see `icons.ts`) shown before the label. */
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  action?: () => void;
  /** Nested items; opens on hover/click/ArrowRight. */
  submenu?: MenuItem[];
}
/** A divider line. */
export interface MenuSeparator { separator: true }
/** Any menu entry. */
export type MenuItem = MenuAction | MenuSeparator;

const MARGIN = 8;
const isSep = (i: MenuItem): i is MenuSeparator => "separator" in i;

/** One open menu panel (root or submenu). */
interface Level { el: HTMLElement; items: MenuItem[]; rows: (HTMLElement | null)[]; idx: number }

let current: (() => void) | null = null;

/** Keeps a fixed-position element inside the viewport. */
function place(el: HTMLElement, x: number, y: number, flipX = 0): void {
  const r = el.getBoundingClientRect();
  let left = x;
  if (left + r.width > window.innerWidth - MARGIN) left = flipX ? flipX - r.width : window.innerWidth - r.width - MARGIN;
  const top = Math.min(y, window.innerHeight - r.height - MARGIN);
  el.style.left = `${Math.max(MARGIN, left)}px`;
  el.style.top = `${Math.max(MARGIN, top)}px`;
}

/**
 * Shows a context menu at viewport coords (x, y), replacing any open one.
 * Closes on item activation, outside mousedown or Esc. Keyboard: Up/Down (wraps,
 * skips disabled), Enter/Space, Right opens submenu, Left closes it, Home/End.
 * @returns a function that closes the menu.
 */
export function showContextMenu(x: number, y: number, items: MenuItem[]): () => void {
  current?.();
  const levels: Level[] = [];

  const closeFrom = (depth: number) => {
    while (levels.length > depth) levels.pop()!.el.remove();
  };
  const closeAll = () => {
    closeFrom(0);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("mousedown", onDown, true);
    if (current === closeAll) current = null;
  };

  const setHover = (lv: Level, i: number) => {
    lv.rows.forEach((r, k) => r?.classList.toggle("dk-menu__item--hover", k === i));
    lv.idx = i;
  };
  const activate = (lv: Level, i: number) => {
    const it = lv.items[i];
    if (isSep(it) || it.disabled) return;
    if (it.submenu) { openSub(lv, i); return; }
    closeAll();
    it.action?.();
  };

  const build = (list: MenuItem[], px: number, py: number, flipX = 0): Level => {
    const el = document.createElement("div");
    el.className = "dk-menu";
    el.setAttribute("role", "menu");
    const lv: Level = { el, items: list, rows: [], idx: -1 };
    list.forEach((it, i) => {
      if (isSep(it)) {
        const s = document.createElement("div");
        s.className = "dk-menu__sep";
        s.setAttribute("role", "separator");
        el.append(s);
        lv.rows.push(null);
        return;
      }
      const row = document.createElement("div");
      row.className = "dk-menu__item" + (it.disabled ? " dk-menu__item--disabled" : "") + (it.danger ? " dk-menu__item--danger" : "");
      row.setAttribute("role", "menuitem");
      if (it.disabled) row.setAttribute("aria-disabled", "true");
      if (it.icon) row.insertAdjacentHTML("beforeend", icon(it.icon));
      const label = document.createElement("span");
      label.textContent = it.label;
      row.append(label);
      if (it.submenu) {
        const a = document.createElement("span");
        a.className = "dk-menu__arrow";
        a.innerHTML = icon("chevron-right");
        row.append(a);
      } else if (it.shortcut) {
        const k = document.createElement("kbd");
        k.className = "dk-kbd";
        k.textContent = it.shortcut;
        row.append(k);
      }
      row.addEventListener("mouseenter", () => {
        if (it.disabled) return;
        closeFrom(levels.indexOf(lv) + 1);
        setHover(lv, i);
        if (it.submenu) openSub(lv, i);
      });
      row.addEventListener("click", () => activate(lv, i));
      el.append(row);
      lv.rows.push(row);
    });
    document.body.append(el);
    place(el, px, py, flipX);
    levels.push(lv);
    return lv;
  };

  const openSub = (lv: Level, i: number) => {
    const it = lv.items[i];
    if (isSep(it) || !it.submenu) return;
    closeFrom(levels.indexOf(lv) + 1);
    const r = lv.rows[i]!.getBoundingClientRect();
    const sub = build(it.submenu, r.right, r.top, r.left);
    setHover(sub, nextEnabled(sub, -1, 1));
  };

  const nextEnabled = (lv: Level, from: number, dir: 1 | -1): number => {
    const n = lv.items.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      const it = lv.items[i];
      if (!isSep(it) && !it.disabled) return i;
    }
    return -1;
  };

  function onKey(e: KeyboardEvent): void {
    const lv = levels[levels.length - 1];
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    switch (e.key) {
      case "Escape": stop(); closeAll(); break;
      case "ArrowDown": stop(); setHover(lv, nextEnabled(lv, lv.idx, 1)); break;
      case "ArrowUp": stop(); setHover(lv, nextEnabled(lv, lv.idx < 0 ? 0 : lv.idx, -1)); break;
      case "Home": stop(); setHover(lv, nextEnabled(lv, -1, 1)); break;
      case "End": stop(); setHover(lv, nextEnabled(lv, 0, -1)); break;
      case "ArrowRight": {
        const it = lv.items[lv.idx];
        if (it && !isSep(it) && it.submenu && !it.disabled) { stop(); openSub(lv, lv.idx); }
        break;
      }
      case "ArrowLeft": if (levels.length > 1) { stop(); closeFrom(levels.length - 1); } break;
      case "Enter": case " ": if (lv.idx >= 0) { stop(); activate(lv, lv.idx); } break;
      case "Tab": stop(); closeAll(); break;
    }
  }
  function onDown(e: MouseEvent): void {
    if (!levels.some((l) => l.el.contains(e.target as Node))) closeAll();
  }

  build(items, x, y);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("mousedown", onDown, true);
  current = closeAll;
  return closeAll;
}
