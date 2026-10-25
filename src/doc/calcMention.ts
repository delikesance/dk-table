/** `@` in a formula field: lists the cells matching the typed names; Enter/Tab insert their address (`Synthese!B3`). */
import { searchRefs, type RefBook, type RefHit } from "./refs";
import { toDisplay } from "./calcSrc";

/** Handle of an attached popup. */
export interface CalcMention { destroy(): void }

const AT = /@([^@\n]{1,40})$/;

/** Attach the `@` search to `input`; attach BEFORE the field's own keydown handler so the list gets its keys first. */
export function attachCalcMention(input: HTMLInputElement, book: RefBook): CalcMention {
  const pop = document.createElement("div");
  pop.className = "dk-mention";
  pop.hidden = true;
  let hits: RefHit[] = [], sel = 0, from = 0;
  const close = (): void => { hits = []; pop.hidden = true; };
  /** Re-run the search for the "@words" before the caret. */
  const update = (): void => {
    const before = input.value.slice(0, input.selectionStart ?? input.value.length);
    const m = AT.exec(before);
    hits = m ? searchRefs(book, m[1]) : [];
    if (!hits.length) { close(); return; }
    from = before.length - m![0].length;
    sel = Math.min(sel, hits.length - 1);
    render();
  };
  const render = (): void => {
    const ul = document.createElement("ul");
    hits.forEach((h, i) => {
      const li = document.createElement("li");
      li.className = i === sel ? "dk-mention__item dk-mention__item--on" : "dk-mention__item";
      li.innerHTML = "<span></span><small></small>";
      li.firstElementChild!.textContent = h.label;
      li.lastElementChild!.textContent = `${h.address} · ${h.text}`;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); sel = i; choose(); });
      ul.append(li);
    });
    pop.replaceChildren(ul);
    if (!pop.isConnected) document.body.append(pop);
    const r = input.getBoundingClientRect();
    pop.style.left = `${Math.max(0, r.left)}px`;
    pop.style.top = `${r.bottom + 4}px`;
    pop.hidden = false;
  };
  /** Replace "@words" with the address of the selected cell. */
  const choose = (): void => {
    const h = hits[sel], caret = input.selectionStart ?? input.value.length;
    const addr = toDisplay(`{${h.target.sheet}}!${h.target.ref}`, book.sheets());
    input.value = input.value.slice(0, from) + addr + input.value.slice(caret);
    const at = from + addr.length;
    input.setSelectionRange(at, at);
    close();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const onKey = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (!hits.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { sel = (sel + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length; render(); }
    else if (e.key === "Enter" || e.key === "Tab") choose();
    else if (e.key === "Escape") close();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  input.addEventListener("keydown", onKey);
  input.addEventListener("input", update);
  input.addEventListener("blur", close);
  return { destroy() { pop.remove(); input.removeEventListener("keydown", onKey); input.removeEventListener("input", update); input.removeEventListener("blur", close); } };
}
