/** Node view of a `cellRef`: a chip showing the cited value, a hover card, click to open the cell. */
import type { Node } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import { resolveRef, type RefBook, type RefTarget } from "./refs";

/** What a node view needs from the editor. */
export interface RefViewHost {
  book: RefBook;
  open(t: RefTarget): void;
  /** Live chips, so the editor can refresh them all after a recalculation. */
  views: Set<RefView>;
}

/** The hover card, one at a time. */
let card: HTMLElement | null = null;
/** Remove the hover card. */
export function hideCard(): void { card?.remove(); card = null; }

/** Show the card of `t` under `anchor`: address, value, formula (when there is one), key hints. */
function showCard(anchor: HTMLElement, host: RefViewHost, t: RefTarget): void {
  hideCard();
  const r = resolveRef(host.book, t);
  card = document.createElement("div");
  card.className = "dk-refcard";
  const line = (cls: string, text: string): void => {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    card!.append(d);
  };
  if (r.error) {
    line("dk-refcard__title dk-refcard__title--err", `${t.ref} introuvable`);
    line("dk-refcard__row", "La cible a été supprimée. Le texte autour reste intact.");
  } else {
    line("dk-refcard__title", r.address);
    line("dk-refcard__row", `Valeur  ${r.text}`);
    if (r.raw?.startsWith("=")) line("dk-refcard__row dk-refcard__mono", `Formule  ${r.raw}`);
    line("dk-refcard__hint", "Clic : ouvrir la cellule · Alt+← : revenir ici");
  }
  document.body.append(card);
  const b = anchor.getBoundingClientRect();
  card.style.left = `${Math.max(0, b.left)}px`;
  card.style.top = `${b.bottom + 6}px`;
}

/** Live chip for one reference node. */
export class RefView implements NodeView {
  dom: HTMLElement;
  private node: Node;
  constructor(node: Node, private host: RefViewHost) {
    this.node = node;
    this.dom = document.createElement("span");
    this.dom.addEventListener("click", () => host.open(this.target()));
    this.dom.addEventListener("mouseover", () => showCard(this.dom, host, this.target()));
    this.dom.addEventListener("mouseout", hideCard);
    host.views.add(this);
    this.refresh();
  }
  private target(): RefTarget { return { sheet: this.node.attrs.sheet, ref: this.node.attrs.ref }; }
  /** Re-read the cited value. */
  refresh(): void {
    const r = resolveRef(this.host.book, this.target());
    this.dom.className = r.error ? "dk-ref dk-ref--err" : "dk-ref";
    this.dom.textContent = r.text;
    this.dom.dataset.address = r.address;
  }
  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.refresh();
    return true;
  }
  stopEvent(): boolean { return false; }
  ignoreMutation(): boolean { return true; }
  destroy(): void { this.host.views.delete(this); hideCard(); }
}
