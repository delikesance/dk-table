/** Sheet tab strip: select, add, rename and keyboard navigation of tabs. */
import "./tabs.css";
import { icon } from "../icons";
import { showToast } from "../toast/toast";

/** A sheet entry shown as a tab. */
export interface SheetInfo { id: string; name: string; /** "doc" for a dk doc tab (default: sheet). */ kind?: "doc" }

/** Callbacks and options for {@link createSheetTabs}. */
export interface SheetTabsOptions {
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  /** Optional: new id order after Alt+Arrow reorder. */
  onReorder?: (ids: string[]) => void;
  /** Synchronous confirmation for delete (tests); defaults to a "Supprimer" toast. */
  confirm?: (message: string) => boolean;
}

/** Public handle of the sheet tabs bar. */
export interface SheetTabs {
  setSheets(sheets: SheetInfo[]): void;
  setActive(id: string): void;
}

/**
 * Bottom sheet-tabs bar (`.dk-tabs`). Click = switch, double-click = rename
 * (Enter/Escape), Delete key or right-click = delete (confirmed, never the last
 * sheet), ArrowLeft/Right = switch, Alt+Arrow = reorder, "+" = add.
 * Keyboard: roving tabindex, ARIA tablist.
 */
export function createSheetTabs(host: HTMLElement, opts: SheetTabsOptions): SheetTabs {
  const bar = document.createElement("div");
  bar.className = "dk-tabs";
  bar.setAttribute("role", "tablist");
  bar.setAttribute("aria-label", "Feuilles");
  host.appendChild(bar);
  let sheets: SheetInfo[] = [];
  let active = "";
  let focusId: string | null = null;

  /** Ask then delete sheet `id`; the last sheet is protected. */
  const tryDelete = (s: SheetInfo): void => {
    if (sheets.length <= 1) return;
    const msg = `Supprimer la feuille « ${s.name} » ?`;
    if (opts.confirm) { if (opts.confirm(msg)) opts.onDelete(s.id); return; }
    showToast({ message: msg, actionLabel: "Supprimer", onAction: () => opts.onDelete(s.id) });
  };

  /** Swap tab `s` for an input; commit on Enter/blur, cancel on Escape. */
  const startRename = (tab: HTMLElement, s: SheetInfo): void => {
    const inp = document.createElement("input");
    inp.className = "dk-tab__input";
    inp.value = s.name;
    inp.setAttribute("aria-label", "Nom de la feuille");
    let done = false;
    const finish = (commit: boolean): void => {
      if (done) return;
      done = true;
      const v = inp.value.trim();
      if (commit && v && v !== s.name) opts.onRename(s.id, v);
      focusId = s.id;
      render();
    };
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
    });
    inp.addEventListener("blur", () => finish(true));
    tab.replaceChildren(inp);
    inp.focus();
    inp.select();
  };

  /** Move sheet `i` by `d` positions and notify. */
  const reorder = (i: number, d: number): void => {
    const j = i + d;
    if (j < 0 || j >= sheets.length) return;
    const ids = sheets.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    focusId = sheets[i].id;
    opts.onReorder?.(ids);
  };

  /** Keyboard handling for tab `i`. */
  const onKey = (e: KeyboardEvent, i: number): void => {
    const s = sheets[i];
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d && e.altKey) { e.preventDefault(); reorder(i, d); }
    else if (d) {
      const n = sheets[i + d];
      if (n) { e.preventDefault(); focusId = n.id; opts.onSwitch(n.id); }
    } else if (e.key === "Delete") { e.preventDefault(); tryDelete(s); }
    else if (e.key === "F2") { e.preventDefault(); startRename(bar.querySelectorAll<HTMLElement>(".dk-tab:not(.dk-tab--add)")[i], s); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opts.onSwitch(s.id); }
  };

  /** Rebuild the DOM from state. */
  function render(): void {
    bar.replaceChildren();
    sheets.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dk-tab" + (s.id === active ? " dk-tab--active" : "") + (s.kind === "doc" ? " dk-tab--doc" : "");
      b.textContent = s.name;
      b.dataset.id = s.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(s.id === active));
      b.tabIndex = s.id === active ? 0 : -1;
      b.title = "Double-clic : renommer · Suppr : supprimer";
      b.addEventListener("click", () => opts.onSwitch(s.id));
      b.addEventListener("dblclick", () => startRename(b, s));
      b.addEventListener("contextmenu", (e) => { e.preventDefault(); tryDelete(s); });
      b.addEventListener("keydown", (e) => onKey(e, i));
      bar.appendChild(b);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "dk-tab dk-tab--add";
    add.innerHTML = icon("plus");
    add.setAttribute("aria-label", "Ajouter une feuille");
    add.title = "Ajouter une feuille";
    add.addEventListener("click", () => opts.onAdd());
    bar.appendChild(add);
    if (focusId) {
      bar.querySelector<HTMLElement>(`[data-id="${CSS.escape(focusId)}"]`)?.focus();
      focusId = null;
    }
  }

  return {
    setSheets(next) { sheets = next.slice(); render(); },
    setActive(id) { active = id; render(); },
  };
}
