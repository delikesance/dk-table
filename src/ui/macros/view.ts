/**
 * Full-screen macro editor (the content of a macro tab): Lua editor with syntax colors and completion,
 * and a bottom bar with the run output and the Run button (also Ctrl+Enter).
 */
import "./macros.css";
import { createLuaEditor, type LuaEditor } from "./editor";
import { resultText } from "./result";
import type { MacroStore } from "../../macros/store";
import type { RunResult } from "../../macros/lua";

/** View options. */
export interface MacroViewOptions {
  store: MacroStore;
  /** Macro edited in this view. */
  id: string;
  /** Run the macro and return its result. */
  run(): RunResult;
}

/** Handle of a mounted view. */
export interface MacroView { destroy(): void; focus(): void }

/** Build the editor view of macro `o.id` in `host` (the caller clears the host on destroy). */
export function createMacroView(host: HTMLElement, o: MacroViewOptions): MacroView {
  const el = document.createElement("section");
  el.className = "dk-mview";
  el.setAttribute("aria-label", "Éditeur de macro");
  el.innerHTML = '<div class="dk-mview__editor"></div><footer class="dk-mview__foot"><output class="dk-mview__out"></output>' +
    '<button type="button" class="dk-macros__btn dk-macros__run dk-mview__run">Exécuter <kbd>Ctrl Entrée</kbd></button></footer>';
  host.append(el);
  const out = el.querySelector<HTMLOutputElement>(".dk-mview__out")!;
  const run = () => {
    const r = o.run();
    out.textContent = resultText(r);
    out.classList.toggle("dk-mview__out--error", !r.ok);
  };
  const editor: LuaEditor = createLuaEditor(el.querySelector<HTMLElement>(".dk-mview__editor")!, {
    code: o.store.get(o.id)?.code ?? "", onRun: run, onChange: (c) => o.store.update(o.id, { code: c }),
  });
  el.querySelector(".dk-mview__run")!.addEventListener("click", run);
  return { destroy: () => { editor.view.destroy(); el.remove(); }, focus: () => editor.focus() };
}
