/**
 * Macro panel (right side, closed by default): header (new, close), macro list,
 * Lua editor and output line with the Run button. Rename: double-click or context
 * menu; delete: context menu.
 */
import "./macros.css";
import { createLuaEditor, type LuaEditor } from "./editor";
import { showContextMenu } from "../contextmenu/contextmenu";
import type { MacroStore } from "../../macros/store";
import type { RunResult } from "../../macros/lua";

/** Panel callbacks. */
export interface MacroPanelOptions {
  store: MacroStore;
  /** Run a macro and return its result (shown in the output line). */
  run(id: string): RunResult;
}

/** Public panel handle. */
export interface MacroPanel {
  el: HTMLElement;
  /** Show the panel on `id` (or the current/first macro, creating one if none). */
  open(id?: string): void;
  close(): void;
  isOpen(): boolean;
  /** Show a run started elsewhere (palette): errors open the panel on that macro. */
  report(id: string, r: RunResult): void;
}

const TEMPLATE =
  '<header class="dk-macros__head"><h2 class="dk-macros__title">Macros</h2>' +
  '<button type="button" class="dk-macros__btn dk-macros__new">+ Nouvelle</button>' +
  '<button type="button" class="dk-macros__btn dk-macros__close" aria-label="Fermer">×</button></header>' +
  '<ul class="dk-macros__list" role="listbox" aria-label="Macros"></ul>' +
  '<div class="dk-macros__editor"></div>' +
  '<footer class="dk-macros__foot"><output class="dk-macros__out"></output>' +
  '<button type="button" class="dk-macros__btn dk-macros__run">Exécuter <kbd>Ctrl Entrée</kbd></button></footer>';

/** Text shown after a run: printed lines, the error, or "Terminé". */
function resultText(r: RunResult): string {
  return r.error ?? (r.output.length ? r.output.join("\n") : "Terminé");
}

/** Build the panel in `host`. */
export function createMacroPanel(host: HTMLElement, o: MacroPanelOptions): MacroPanel {
  const el = document.createElement("aside");
  el.className = "dk-macros";
  el.hidden = true;
  el.innerHTML = TEMPLATE;
  host.append(el);
  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
  const list = q<HTMLUListElement>(".dk-macros__list"), out = q<HTMLOutputElement>(".dk-macros__out");
  let current: string | undefined;
  let editor: LuaEditor | undefined;

  const show = (r: RunResult) => {
    out.textContent = resultText(r);
    out.classList.toggle("dk-macros__out--error", !r.ok);
  };
  const runCurrent = () => { if (current) show(o.run(current)); };

  /** Load macro `id` into the editor. */
  const select = (id: string) => {
    current = id;
    const code = o.store.get(id)?.code ?? "";
    if (!editor) editor = createLuaEditor(q(".dk-macros__editor"), { code, onRun: runCurrent,
      onChange: (c) => current && o.store.update(current, { code: c }) });
    else editor.setCode(code);
    out.textContent = "";
    renderList();
  };

  /** Replace the item label by an input; Enter/blur commits, Escape cancels. */
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

  const remove = (id: string) => {
    o.store.remove(id);
    if (current !== id) return;
    const next = o.store.list()[0];
    if (next) select(next.id);
    else { current = undefined; editor?.setCode(""); }
  };

  function renderList(): void {
    list.replaceChildren(...o.store.list().map((m) => {
      const li = document.createElement("li");
      li.className = "dk-macros__item" + (m.id === current ? " dk-macros__item--active" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(m.id === current));
      li.tabIndex = 0;
      li.textContent = m.name;
      li.addEventListener("click", () => { if (m.id !== current) select(m.id); });
      li.addEventListener("dblclick", () => rename(li, m.id));
      li.addEventListener("keydown", (e) => { if (e.key === "Enter") select(m.id); else if (e.key === "F2") rename(li, m.id); });
      li.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { label: "Exécuter", action: () => { select(m.id); runCurrent(); } },
          { label: "Renommer", shortcut: "F2", action: () => rename(li, m.id) },
          { separator: true },
          { label: "Supprimer", danger: true, action: () => remove(m.id) },
        ]);
      });
      return li;
    }));
  }

  q(".dk-macros__new").addEventListener("click", () => { select(o.store.create().id); editor?.focus(); });
  q(".dk-macros__close").addEventListener("click", () => panel.close());
  q(".dk-macros__run").addEventListener("click", runCurrent);
  o.store.onChange(() => {
    if (current && !o.store.get(current)) { current = undefined; editor?.setCode(""); }
    if (!el.hidden && list.querySelector(".dk-macros__rename") === null) renderList();
  });

  const panel: MacroPanel = {
    el,
    open(id) {
      el.hidden = false;
      const target = id ?? (current && o.store.get(current) ? current : o.store.list()[0]?.id) ?? o.store.create().id;
      if (target !== current || !editor) select(target);
      else renderList();
      editor?.focus();
    },
    close() { el.hidden = true; },
    isOpen: () => !el.hidden,
    report(id, r) {
      if (!r.ok) panel.open(id);
      if (!el.hidden && current === id) show(r);
    },
  };
  return panel;
}
