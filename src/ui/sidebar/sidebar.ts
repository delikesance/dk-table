import "./sidebar.css";

/** Function documentation entry. */
export interface FnDoc { name: string; signature: string; description: string }
/** Recent file entry. */
export interface RecentFile { path: string; name: string }
/** Info about the active cell. */
export interface CellInfo { ref: string; raw: string; display: string; format: string }

/** Options for {@link createSidebar}. */
export interface SidebarOptions {
  functions: FnDoc[];
  /** Called with the function name when the user picks one. */
  onInsert: (name: string) => void;
  onOpenRecent: (path: string) => void;
}

/** Public handle of the sidebar. */
export interface Sidebar {
  setRecent(files: RecentFile[]): void;
  setCellInfo(info: CellInfo | null): void;
  /** Show/hide the whole panel. */
  toggle(): void;
}

/** Create an element with class and optional text. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Make `li` activatable by click and Enter/Space. */
function activatable(li: HTMLElement, fn: () => void): void {
  li.tabIndex = 0;
  li.addEventListener("click", fn);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  });
}

/** Collapsible section (`.dk-section`) with a button header; returns [section, body]. */
function section(title: string): [HTMLElement, HTMLElement] {
  const sec = el("section", "dk-section");
  const head = el("button", "dk-section__head", title);
  head.type = "button";
  head.setAttribute("aria-expanded", "true");
  head.addEventListener("click", () => {
    const closed = sec.classList.toggle("dk-section--closed");
    head.setAttribute("aria-expanded", String(!closed));
  });
  const body = el("div", "dk-section__body");
  sec.append(head, body);
  return [sec, body];
}

/**
 * Collapsible side panel (`.dk-sidebar`) with three sections: recent files,
 * function list with search (pick = onInsert(name)) and active-cell info.
 */
export function createSidebar(host: HTMLElement, opts: SidebarOptions): Sidebar {
  const root = el("aside", "dk-sidebar");
  root.setAttribute("aria-label", "Panneau latéral");
  const [recSec, recBody] = section("Fichiers récents");
  const [fnSec, fnBody] = section("Fonctions");
  const [infoSec, infoBody] = section("Cellule");
  root.append(recSec, fnSec, infoSec);
  host.appendChild(root);

  const recent = el("ul", "dk-list dk-recent");
  recBody.appendChild(recent);
  const info = el("div", "dk-cellinfo");
  infoBody.appendChild(info);
  const search = el("input", "dk-sidebar__search");
  search.type = "search";
  search.placeholder = "Rechercher une fonction";
  search.setAttribute("aria-label", "Rechercher une fonction");
  const list = el("ul", "dk-list dk-fn-list");
  fnBody.append(search, list);

  /** Re-render the function list filtered by the search text. */
  const renderFns = (): void => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const f of opts.functions) {
      if (q && !f.name.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q)) continue;
      const li = el("li", "dk-item");
      li.dataset.name = f.name;
      li.title = `${f.signature} — ${f.description}`;
      li.append(el("span", "dk-item__name", f.name), el("span", "dk-item__meta", f.signature));
      activatable(li, () => opts.onInsert(f.name));
      list.appendChild(li);
    }
  };
  search.addEventListener("input", renderFns);
  renderFns();

  /** Render the cell info rows (or an empty hint). */
  const renderInfo = (c: CellInfo | null): void => {
    info.replaceChildren();
    if (!c) { info.appendChild(el("p", "dk-cellinfo__empty", "Aucune cellule")); return; }
    const rows: [string, string][] = [["Cellule", c.ref], ["Contenu", c.raw], ["Valeur", c.display], ["Format", c.format]];
    for (const [k, v] of rows) {
      const r = el("div", "dk-cellinfo__row");
      r.append(el("span", "dk-cellinfo__key", k), el("span", "dk-cellinfo__val", v));
      info.appendChild(r);
    }
  };
  renderInfo(null);

  return {
    setRecent(files) {
      recent.replaceChildren();
      for (const f of files) {
        const li = el("li", "dk-item", f.name);
        li.title = f.path;
        activatable(li, () => opts.onOpenRecent(f.path));
        recent.appendChild(li);
      }
    },
    setCellInfo: renderInfo,
    toggle() { root.hidden = !root.hidden; },
  };
}
