/**
 * Function popup for a formula text field (cell editor textarea or formula bar input).
 * While a name is typed after "=" (or an operator, "(" or ";"), lists matching functions with their description
 * and the signature of the selected one; ArrowUp/Down choose, Enter/Tab insert `NAME(`, Escape closes the list.
 * Inside a call, shows the signature with the argument under the caret highlighted (keys pass through).
 * Usage: `attachFnComplete(input)` BEFORE the field's own keydown handler, so the list can take its keys first.
 */
import "./fnPopup.css";
import { FN_DOCS } from "../fndocs";
import type { FnDoc } from "../sidebar/sidebar";
import { applyFn, fnCompletion, signatureParts, type FnCompletion } from "./fnComplete";

type Field = HTMLInputElement | HTMLTextAreaElement;

/** Handle returned by {@link attachFnComplete}. */
export interface FnComplete {
  /** True while the function list (not the hint) is shown. */
  listOpen(): boolean;
  /** Remove the popup and its listeners. */
  destroy(): void;
}

/** Create an element with class and optional text. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Signature line of `doc` with argument `arg` highlighted (-1 = none). */
function signature(doc: FnDoc, arg: number): HTMLElement {
  const { name, args } = signatureParts(doc.signature);
  const sig = el("div", "dk-fnpop__sig");
  sig.append(name + "(");
  const on = Math.min(arg, args.length - 1); // past the last label (variadic SUM(a; b; …)): keep the last one
  args.forEach((a, i) => {
    if (i) sig.append("; ");
    sig.append(el("span", i === on ? "dk-fnpop__arg dk-fnpop__arg--on" : "dk-fnpop__arg", a));
  });
  sig.append(")");
  return sig;
}

/** Attach the popup to `input`, proposing `docs` (default: the documented functions). */
export function attachFnComplete(input: Field, docs: FnDoc[] = FN_DOCS): FnComplete {
  const pop = el("div", "dk-fnpop");
  pop.hidden = true;
  pop.setAttribute("role", "listbox");
  pop.setAttribute("aria-label", "Fonctions");
  let state: FnCompletion = null;
  let sel = 0;
  let dismissed = false;

  /** Place the popup under the field (above it when there is no room below). */
  function place(): void {
    const r = input.getBoundingClientRect();
    const h = pop.offsetHeight || 0;
    const below = r.bottom + 2 + h <= window.innerHeight || r.top - 2 - h < 0;
    pop.style.left = `${Math.max(0, Math.min(r.left, window.innerWidth - (pop.offsetWidth || 0)))}px`;
    pop.style.top = `${below ? r.bottom + 2 : r.top - 2 - h}px`;
  }

  function render(): void {
    if (!state) { pop.hidden = true; return; }
    if (!pop.isConnected) document.body.append(pop);
    pop.classList.toggle("dk-fnpop--hint", state.kind === "hint");
    if (state.kind === "hint") {
      const desc = el("div", "dk-fnpop__desc", state.doc.description);
      pop.replaceChildren(signature(state.doc, state.arg), desc);
    } else {
      const list = el("ul", "dk-fnpop__list");
      state.options.forEach((d, i) => {
        const li = el("li", i === sel ? "dk-fnpop__item dk-fnpop__item--selected" : "dk-fnpop__item");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === sel));
        li.append(el("span", "dk-fnpop__name", d.name), el("span", "dk-fnpop__desc", d.description));
        li.addEventListener("mousedown", (e) => { e.preventDefault(); sel = i; accept(); });
        list.append(li);
      });
      pop.replaceChildren(list, signature(state.options[sel], -1));
      list.children[sel]?.scrollIntoView?.({ block: "nearest" });
    }
    pop.hidden = false;
    place();
  }

  /** Recompute the completion at the caret; `reset` puts the selection back on the first match. */
  function update(reset: boolean): void {
    const next = dismissed || document.activeElement !== input && !reset ? null
      : fnCompletion(input.value, input.selectionStart ?? input.value.length, docs);
    const same = state?.kind === "list" && next?.kind === "list" && state.from === next.from
      && state.options.length === next.options.length;
    if (reset || !same) sel = 0;
    state = next;
    render();
  }

  /** Insert the selected function at the typed word. */
  function accept(): void {
    if (state?.kind !== "list") return;
    const r = applyFn(input.value, state.from, input.selectionStart ?? input.value.length, state.options[sel].name);
    input.value = r.text;
    input.setSelectionRange(r.caret, r.caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const onKey = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (state?.kind !== "list" || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = state.options.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") sel = (sel + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
    else if (e.key === "Enter" || e.key === "Tab") accept();
    else if (e.key === "Escape") { dismissed = true; state = null; }
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
    render();
  };
  const onInput = (): void => { dismissed = false; update(true); };
  const onCaret = (e: Event): void => {
    if (e instanceof KeyboardEvent && !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    update(false);
  };
  const onBlur = (): void => { state = null; render(); };
  input.addEventListener("keydown", onKey);
  input.addEventListener("input", onInput);
  input.addEventListener("keyup", onCaret);
  input.addEventListener("click", onCaret);
  input.addEventListener("blur", onBlur);
  if (document.activeElement === input) update(true); // editor opened by typing "="

  return {
    listOpen: () => state?.kind === "list",
    destroy() {
      pop.remove();
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("input", onInput);
      input.removeEventListener("keyup", onCaret);
      input.removeEventListener("click", onCaret);
      input.removeEventListener("blur", onBlur);
    },
  };
}
