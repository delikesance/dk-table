/**
 * Macro list panel (right side, closed by default): header (new, close) and one row per macro with a run
 * button and a pencil that opens the full-screen editor tab. The code is never edited here. Rename: F2 or
 * context menu; delete: context menu.
 */
import "./macros.css";
import { icon } from "../icons";
import { showContextMenu } from "../contextmenu/contextmenu";
import { resultText } from "./result";
import type { MacroStore } from "../../macros/store";
import type { RunResult } from "../../macros/lua";

/** Panel callbacks. */
export interface MacroPanelOptions {
  store: MacroStore;
  /** Run a macro and return its result (shown in the output line). */
  run(id: string): RunResult;
  /** Open the full-screen editor tab of a macro. */
  edit(id: string): void;
}

/** Public panel handle. */
export interface MacroPanel {
  el: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Show a run started elsewhere (palette); errors open the panel. */
  report(r: RunResult): void;
}

const TEMPLATE =
  '<header class="dk-macros__head"><h2 class="dk-macros__title">Macros</h2>' +
  '<button type="button" class="dk-macros__btn dk-macros__new">+ Nouvelle</button>' +
  '<button type="button" class="dk-macros__btn dk-macros__close" aria-label="Fermer">×</button></header>' +
  '<ul class="dk-macros__list" aria-label="Macros"></ul>' +
  '<footer class="dk-macros__foot"><output class="dk-macros__out"></output></footer>';

/** Build the panel in `host`. */
export function createMacroPanel(host: HTMLElement, o: MacroPanelOptions): MacroPanel {
  const el = document.createElement("aside");
  el.className = "dk-macros";
  el.hidden = true;
  el.innerHTML = TEMPLATE;
  host.append(el);
  const list = el.querySelector<HTMLUListElement>(".dk-macros__list")!;
  const out = el.querySelector<HTMLOutputElement>(".dk-macros__out")!;

  const show = (r: RunResult) => {
    out.textContent = resultText(r);
    out.classList.toggle("dk-macros__out--error", !r.ok);
  };
  const run = (id: string) => show(o.run(id));

  /** Replace the row label by an input; Enter/blur commits, Escape cancels. */
  const rename = (li: HTMLElement, id: string) => {
    const input = document.createElement("input");
    input.className = "dk-macros__rename";
    input.value = o.store.get(id)?.name ?? "";
    let done = false;
    const finish = (commit: boolean) => {
      if (done) return;
      done = true;
      if (commit) o.store.update(id, { name: input.value });
      renderList();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
      e.stopPropagation();
    });
    input.addEventListener("blur", () => finish(true));
    li.replaceChildren(input);
    input.select();
  };

  const button = (action: string, label: string, name: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dk-macros__act";
    b.dataset.action = action;
    b.title = b.ariaLabel = label;
    b.innerHTML = icon(name);
    b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
    return b;
  };

  function renderList(): void {
    list.replaceChildren(...o.store.list().map((m) => {
      const li = document.createElement("li");
      li.className = "dk-macros__item";
      li.tabIndex = 0;
      const name = document.createElement("span");
      name.className = "dk-macros__name";
      name.textContent = m.name;
      li.append(name, button("run", "Exécuter", "play", () => run(m.id)), button("edit", "Modifier le code", "edit", () => o.edit(m.id)));
      li.addEventListener("click", () => o.edit(m.id));
      li.addEventListener("keydown", (e) => { if (e.target !== li) return; if (e.key === "Enter") o.edit(m.id); else if (e.key === "F2") rename(li, m.id); });
      li.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { label: "Exécuter", action: () => run(m.id) },
          { label: "Modifier le code", action: () => o.edit(m.id) },
          { label: "Renommer", shortcut: "F2", action: () => rename(li, m.id) },
          { separator: true },
          { label: "Supprimer", danger: true, action: () => o.store.remove(m.id) },
        ]);
      });
      return li;
    }));
  }

  el.querySelector(".dk-macros__new")!.addEventListener("click", () => o.edit(o.store.create().id));
  el.querySelector(".dk-macros__close")!.addEventListener("click", () => panel.close());
  o.store.onChange(() => { if (!el.hidden && list.querySelector(".dk-macros__rename") === null) renderList(); });

  const panel: MacroPanel = {
    el,
    open() { el.hidden = false; renderList(); },
    close() { el.hidden = true; },
    isOpen: () => !el.hidden,
    report(r) { if (!r.ok) panel.open(); show(r); },
  };
  return panel;
}
