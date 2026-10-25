/** Node view of a `calc` chip: shows the result, a hover card with the formula, edits in place (field + format). */
import type { Node } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import { attachFnComplete } from "../ui/formula/fnPopup";
import { attachCalcMention } from "./calcMention";
import { toDisplay, toStored } from "./calcSrc";
import type { Calc } from "./calc";
import type { RefBook } from "./refs";

/** What a chip needs from the editor. */
export interface CalcHost {
  book: RefBook;
  calc: Calc;
  /** Live chips, refreshed after a recalculation. */
  views: Set<CalcView>;
  /** Store the new formula and format of the chip at `pos`, caret after it. */
  set(pos: number, a: { src: string; fmt: string }): void;
  /** Replace the chip at `pos` with plain text. */
  literal(pos: number, text: string): void;
}

const FORMATS: [string, string][] = [["auto", "Auto"], ["number", "Nombre"], ["percent", "Pourcentage"], ["currency", "Monétaire"]];
let card: HTMLElement | null = null;
const hideCard = (): void => { card?.remove(); card = null; };

/** Small hover card: formula and value. */
function showCard(anchor: HTMLElement, formula: string, value: string, error: boolean): void {
  hideCard();
  card = document.createElement("div");
  card.className = "dk-refcard";
  const line = (cls: string, text: string): void => { const d = document.createElement("div"); d.className = cls; d.textContent = text; card!.append(d); };
  line(error ? "dk-refcard__title dk-refcard__title--err" : "dk-refcard__title", "Calcul");
  line("dk-refcard__row dk-refcard__mono", `Formule  =${formula}`);
  line("dk-refcard__row", `Valeur  ${value || "—"}`);
  line("dk-refcard__hint", "Clic : modifier");
  document.body.append(card);
  const b = anchor.getBoundingClientRect();
  card.style.left = `${Math.max(0, b.left)}px`;
  card.style.top = `${b.bottom + 6}px`;
}

/** A calculation inside the text of a document. */
export class CalcView implements NodeView {
  dom = document.createElement("span");
  private slot: string;
  private editing = false;
  constructor(private node: Node, private getPos: () => number | undefined, private host: CalcHost) {
    this.slot = host.calc.slot();
    this.dom.addEventListener("click", () => { if (!this.editing) this.edit(); });
    this.dom.addEventListener("mouseover", () => { if (!this.editing) this.hover(); });
    this.dom.addEventListener("mouseout", hideCard);
    host.views.add(this);
    if (node.attrs.src === "") this.edit(); else this.refresh();
  }
  private hover(): void {
    const r = this.host.calc.eval(this.slot, this.node.attrs.src, this.node.attrs.fmt);
    showCard(this.dom, toDisplay(this.node.attrs.src, this.host.book.sheets()), this.dom.textContent ?? r.text, !!r.error);
  }
  /** Re-evaluate and redraw (call after a recalculation); a chip being edited is left alone. */
  refresh(): void {
    if (this.editing) return;
    const r = this.host.calc.eval(this.slot, this.node.attrs.src, this.node.attrs.fmt);
    this.dom.className = r.error ? "dk-calc dk-calc--err" : "dk-calc";
    if (r.html) this.dom.innerHTML = r.html; else this.dom.textContent = r.text;
  }
  /** Replace the chip by a formula field (starting with "=") and a format choice. */
  private edit(): void {
    hideCard();
    this.editing = true;
    const sheets = this.host.book.sheets();
    const input = document.createElement("input");
    input.className = "dk-calc__input";
    input.value = `=${toDisplay(this.node.attrs.src, sheets)}`;
    input.spellcheck = false;
    input.setAttribute("aria-label", "Formule");
    const resize = (): void => { input.size = Math.max(10, input.value.length + 2); };
    resize();
    const fmt = document.createElement("select");
    fmt.className = "dk-calc__fmt";
    fmt.setAttribute("aria-label", "Format");
    FORMATS.forEach(([v, l]) => fmt.append(new Option(l, v, false, v === this.node.attrs.fmt)));
    this.dom.className = "dk-calc dk-calc--edit";
    this.dom.replaceChildren(input, fmt);
    const at = attachCalcMention(input, this.host.book), fn = attachFnComplete(input); // the @ list takes its keys first
    let done = false;
    const finish = (commit: boolean): void => {
      if (done) return;
      done = true; this.editing = false; fn.destroy(); at.destroy();
      const pos = this.getPos();
      if (pos === undefined) return;
      const body = input.value.replace(/^=/, "");
      if (!commit) this.host.literal(pos, input.value.startsWith("=") ? input.value : `=${input.value}`);
      else if (body.trim() === "") this.host.literal(pos, "=");
      else this.host.set(pos, { src: toStored(body, sheets), fmt: fmt.value });
      this.refresh();
    };
    input.addEventListener("input", resize);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); finish(true); }
      else if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    this.dom.addEventListener("focusout", (e) => { if (!this.dom.contains(e.relatedTarget as globalThis.Node | null)) finish(true); });
    queueMicrotask(() => input.focus());
  }
  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.refresh();
    return true;
  }
  stopEvent(e: Event): boolean { return this.editing && this.dom.contains(e.target as globalThis.Node); }
  ignoreMutation(): boolean { return true; }
  destroy(): void { this.host.views.delete(this); hideCard(); }
}
