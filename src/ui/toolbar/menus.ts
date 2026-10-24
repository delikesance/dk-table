import { icon } from "../icons";

/** A recent file shown in the "Récents" submenu. */
export interface RecentItem { path: string; name: string }

/** Callbacks fired by the File menu (new/open/recents/save/CSV). */
export interface MenuHandlers {
  onNew(): void; onOpen(): void; onSave(): void; onSaveAs(): void;
  onImportCsv(): void; onExportCsv(): void;
  /** Recent files, read each time the menu opens (omit: "Récents" stays empty). */
  recents?(): RecentItem[];
  onOpenRecent?(path: string): void;
}

/**
 * One menu entry: label, optional icon/shortcut hint, action; `sub` makes it an expandable submenu.
 * `sep` draws a rule above the entry; `checked` makes it a radio item (aria-checked read at each opening).
 */
export interface Entry {
  label: string; icon?: string; hint?: string; run?(): void; sub?(): Entry[];
  sep?: boolean; checked?(): boolean;
}

/** One top-level menu; `items` as a function is re-read each time the menu opens (dynamic lists). */
export interface MenuDef { label: string; items: Entry[] | (() => Entry[]) }

/** Closers of every menu currently built, so opening one closes the others. */
type Closer = () => void;

/** Builds one dropdown (trigger + menu); returns its root. */
function dropdown(label: string, source: MenuDef["items"], closers: Closer[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "dk-menu";
  const trigger = document.createElement("button");
  trigger.type = "button"; trigger.className = "dk-menu__trigger";
  trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false"); trigger.title = `Menu ${label}`;
  trigger.innerHTML = `<span>${label}</span>`;
  const list = document.createElement("div");
  list.className = "dk-menu__list"; list.setAttribute("role", "menu"); list.setAttribute("aria-label", label);
  list.hidden = true;
  let items: HTMLButtonElement[] = [];
  let expanded: Entry | null = null;
  let entries: Entry[] = typeof source === "function" ? source() : source;

  /** Creates one menuitem button; `depth` 1 = submenu item (indented). */
  function makeItem(e: Entry, depth: number): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button"; b.className = "dk-menu__item"; b.tabIndex = -1;
    b.classList.toggle("dk-menu__item--sep", !!e.sep);
    b.setAttribute("role", e.checked ? "menuitemradio" : "menuitem");
    if (e.checked) b.setAttribute("aria-checked", String(e.checked()));
    if (depth) b.style.paddingLeft = "28px";
    const hint = e.sub ? '<span class="dk-menu__hint" aria-hidden="true">▸</span>' : e.hint ? `<kbd class="dk-menu__hint">${e.hint}</kbd>` : "";
    b.innerHTML = `${e.icon ? icon(e.icon) : '<span class="dk-icon"></span>'}<span class="dk-menu__label">${e.label}</span>${hint}`;
    if (e.sub) {
      b.setAttribute("aria-haspopup", "menu"); b.setAttribute("aria-expanded", String(expanded === e));
      b.addEventListener("click", (ev) => { ev.stopPropagation(); expanded = expanded === e ? null : e; render(e); });
    } else b.addEventListener("click", () => { close(); trigger.focus(); e.run?.(); });
    return b;
  }
  /** (Re)builds the item list, expanding the open submenu inline; refocuses the `focus` entry's button. */
  function render(focus?: Entry): void {
    items = [];
    let focused: HTMLButtonElement | undefined;
    for (const e of entries) {
      const b = makeItem(e, 0); items.push(b);
      if (e === focus) focused = b;
      if (e.sub && expanded === e) {
        const subs = e.sub();
        if (!subs.length) subs.push({ label: "Aucun fichier récent" });
        for (const s of subs) { const sb = makeItem(s, 1); if (!s.run) sb.disabled = true; items.push(sb); }
      }
    }
    list.replaceChildren(...items);
    focused?.focus();
  }

  /** Closes this menu. */
  function close(): void {
    list.hidden = true; trigger.setAttribute("aria-expanded", "false");
  }
  /** Opens this menu (closing the others) and focuses the first item. */
  function open(): void {
    closers.forEach((c) => c());
    expanded = null; entries = typeof source === "function" ? source() : source; render();
    list.hidden = false; trigger.setAttribute("aria-expanded", "true"); items[0].focus();
  }
  closers.push(close);
  render();

  trigger.addEventListener("click", () => (list.hidden ? open() : close()));
  trigger.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); open(); }
  });
  list.addEventListener("keydown", (ev) => {
    const live = items.filter((b) => !b.disabled);
    const i = live.indexOf(document.activeElement as HTMLButtonElement);
    const to = (n: number) => { ev.preventDefault(); live[(n + live.length) % live.length].focus(); };
    if (ev.key === "ArrowDown") to(i + 1);
    else if (ev.key === "ArrowUp") to(i - 1);
    else if (ev.key === "Home") to(0);
    else if (ev.key === "End") to(live.length - 1);
    else if (ev.key === "Escape" || ev.key === "Tab") {
      if (ev.key === "Escape") ev.preventDefault();
      close(); trigger.focus();
    }
  });
  root.append(trigger, list);
  return root;
}

/** Entries of the "Fichier" menu (Récents submenu + CSV import/export); actions are only forwarded to `h`. */
export function fileEntries(h: MenuHandlers): Entry[] {
  return [
    { label: "Nouveau", icon: "add", hint: "Ctrl+N", run: h.onNew },
    { label: "Ouvrir", icon: "open", hint: "Ctrl+O", run: h.onOpen },
    { label: "Récents", icon: "open", sub: () => (h.recents?.() ?? []).map((r) => ({ label: r.name, run: () => h.onOpenRecent?.(r.path) })) },
    { label: "Enregistrer", icon: "save", hint: "Ctrl+S", run: h.onSave, sep: true },
    { label: "Enregistrer sous…", icon: "save", hint: "Ctrl+Maj+S", run: h.onSaveAs },
    { label: "Importer CSV", icon: "upload", run: h.onImportCsv, sep: true },
    { label: "Exporter CSV", icon: "download", run: h.onExportCsv },
  ];
}

/**
 * Builds a one-level menu bar (`.dk-menus.dk-menubar`), one dropdown per definition; opening one closes
 * the others, a click outside closes all. Keyboard: Arrows/Home/End move, Enter/Space activate,
 * Escape closes and refocuses the trigger.
 */
export function createMenuBar(defs: MenuDef[]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "dk-menus dk-menubar"; wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", "Menus");
  const closers: Closer[] = [];
  wrap.append(...defs.map((d) => dropdown(d.label, d.items, closers)));
  const onDocClick = (ev: MouseEvent): void => {
    if (!wrap.contains(ev.target as Node)) closers.forEach((c) => c());
  };
  document.addEventListener("click", onDocClick);
  disposers.set(wrap, () => document.removeEventListener("click", onDocClick));
  return wrap;
}

/** The "Fichier" menu alone (kept for callers that only need file actions). */
export function createMenus(h: MenuHandlers): HTMLElement {
  return createMenuBar([{ label: "Fichier", items: fileEntries(h) }]);
}

/** Document-click listener removers, keyed by the element `createMenus` returned. */
const disposers = new WeakMap<HTMLElement, () => void>();

/** Remove the document click listener of a menus element (no-op for null/unknown). */
export function destroyMenus(el: HTMLElement | null): void {
  if (el) disposers.get(el)?.();
}
