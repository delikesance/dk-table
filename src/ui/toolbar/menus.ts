import { icon } from "../icons";

/** Callbacks fired by the File and Import/Export menus. */
export interface MenuHandlers {
  onNew(): void; onOpen(): void; onSave(): void; onSaveAs(): void;
  onImportCsv(): void; onExportCsv(): void;
}

/** One menu entry: label, optional icon name, optional shortcut hint, action. */
interface Entry { label: string; icon?: string; hint?: string; run(): void }

/** Closers of every menu currently built, so opening one closes the others. */
type Closer = () => void;

/** Builds one dropdown (trigger + menu); returns its root and its close function. */
function dropdown(label: string, entries: Entry[], closers: Closer[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "dk-menu";
  const trigger = document.createElement("button");
  trigger.type = "button"; trigger.className = "dk-menu__trigger";
  trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `<span>${label}</span>${icon("tools")}`;
  const list = document.createElement("div");
  list.className = "dk-menu__list"; list.setAttribute("role", "menu"); list.setAttribute("aria-label", label);
  list.hidden = true;

  const items = entries.map((e) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "dk-menu__item"; b.setAttribute("role", "menuitem"); b.tabIndex = -1;
    b.innerHTML = `${e.icon ? icon(e.icon) : '<span class="dk-icon"></span>'}<span class="dk-menu__label">${e.label}</span>` +
      (e.hint ? `<kbd class="dk-menu__hint">${e.hint}</kbd>` : "");
    b.addEventListener("click", () => { close(); trigger.focus(); e.run(); });
    return b;
  });
  list.append(...items);

  /** Closes this menu. */
  function close(): void {
    list.hidden = true; trigger.setAttribute("aria-expanded", "false");
  }
  /** Opens this menu (closing the others) and focuses the first item. */
  function open(): void {
    closers.forEach((c) => c());
    list.hidden = false; trigger.setAttribute("aria-expanded", "true"); items[0].focus();
  }
  closers.push(close);

  trigger.addEventListener("click", () => (list.hidden ? open() : close()));
  trigger.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); open(); }
  });
  list.addEventListener("keydown", (ev) => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const to = (n: number) => { ev.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (ev.key === "ArrowDown") to(i + 1);
    else if (ev.key === "ArrowUp") to(i - 1);
    else if (ev.key === "Home") to(0);
    else if (ev.key === "End") to(items.length - 1);
    else if (ev.key === "Escape" || ev.key === "Tab") {
      if (ev.key === "Escape") ev.preventDefault();
      close(); trigger.focus();
    }
  });
  root.append(trigger, list);
  return root;
}

/**
 * Builds the "Fichier" and "Import / Export" dropdown menus. Actions are only
 * forwarded to `h`; no file logic lives here. Keyboard: Arrows/Home/End move,
 * Enter/Space activate, Escape closes and refocuses the trigger.
 */
export function createMenus(h: MenuHandlers): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "dk-menus"; wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", "Menus");
  const closers: Closer[] = [];
  wrap.append(
    dropdown("Fichier", [
      { label: "Nouveau", icon: "add", hint: "Ctrl+N", run: h.onNew },
      { label: "Ouvrir", icon: "open", hint: "Ctrl+O", run: h.onOpen },
      { label: "Enregistrer", icon: "save", hint: "Ctrl+S", run: h.onSave },
      { label: "Enregistrer sous", icon: "save", hint: "Ctrl+Maj+S", run: h.onSaveAs },
    ], closers),
    dropdown("Import / Export", [
      { label: "Importer un CSV", icon: "upload", run: h.onImportCsv },
      { label: "Exporter en CSV", icon: "download", run: h.onExportCsv },
    ], closers),
  );
  const onDocClick = (ev: MouseEvent): void => {
    if (!wrap.contains(ev.target as Node)) closers.forEach((c) => c());
  };
  document.addEventListener("click", onDocClick);
  disposers.set(wrap, () => document.removeEventListener("click", onDocClick));
  return wrap;
}

/** Document-click listener removers, keyed by the element `createMenus` returned. */
const disposers = new WeakMap<HTMLElement, () => void>();

/** Remove the document click listener of a menus element (no-op for null/unknown). */
export function destroyMenus(el: HTMLElement | null): void {
  if (el) disposers.get(el)?.();
}
