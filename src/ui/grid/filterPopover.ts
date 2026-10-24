/** Popover de filtre de colonne: cases à cocher (valeurs distinctes + compte), OK, « Effacer le filtre ». */
import { icon } from "../icons";
import { EMPTY_LABEL, type Distinct } from "./filter";
import "./filterPopover.css";

/** Paramètres du popover. */
export interface PopoverOpts {
  /** Élément ancre (bouton de l'en-tête). */
  anchor: HTMLElement;
  values: Distinct[];
  /** Valeurs actuellement cochées; null = toutes. */
  selected: Set<string> | null;
  /** Appelé avec les valeurs cochées, ou null pour supprimer le filtre. */
  onApply(selected: string[] | null): void;
}

/** Ajoute un bouton filtre à chaque en-tête; `open(col, bouton)` est appelé au clic. */
export function addFilterButtons(heads: HTMLElement[], open: (col: number, btn: HTMLElement) => void): void {
  heads.forEach((head, c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dkg-filter";
    b.setAttribute("aria-label", `Filtrer la colonne ${head.firstChild?.textContent ?? c + 1}`);
    b.innerHTML = icon("filter").replace(/>\s+</g, "><"); // no stray text nodes in the header
    b.addEventListener("mousedown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); open(c, b); });
    head.appendChild(b);
  });
}

/** Ouvre le popover (dans <body>, position fixe sous l'ancre); retourne sa fonction de fermeture. */
export function openFilterPopover(o: PopoverOpts): () => void {
  const pop = document.createElement("div");
  pop.className = "dkg-pop";
  pop.setAttribute("role", "dialog");
  const allLabel = document.createElement("label");
  allLabel.className = "dkg-pop__all";
  const all = document.createElement("input");
  all.type = "checkbox";
  all.dataset.all = "1";
  allLabel.append(all, document.createTextNode(" Tout sélectionner"));
  const list = document.createElement("div");
  list.className = "dkg-pop__list";
  for (const d of o.values) {
    const label = document.createElement("label");
    if (d.value === EMPTY_LABEL) label.className = "dkg-pop__empty";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.v = d.value;
    box.checked = o.selected ? o.selected.has(d.value) : true;
    const n = document.createElement("span");
    n.className = "dkg-pop__n";
    n.textContent = String(d.count);
    label.append(box, document.createTextNode(` ${d.value} `), n);
    list.appendChild(label);
  }
  const btns = document.createElement("div");
  btns.className = "dkg-pop__btns";
  const mk = (act: string, text: string): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.act = act;
    b.textContent = text;
    btns.appendChild(b);
    return b;
  };
  mk("clear", "Effacer le filtre");
  mk("ok", "OK");
  pop.append(allLabel, list, btns);
  const boxes = (): HTMLInputElement[] => [...list.querySelectorAll<HTMLInputElement>("input")];
  const syncAll = (): void => {
    const on = boxes().filter((i) => i.checked).length;
    all.checked = on === boxes().length;
    all.indeterminate = on > 0 && on < boxes().length;
  };
  syncAll();
  all.addEventListener("change", () => { boxes().forEach((i) => { i.checked = all.checked; }); });
  list.addEventListener("change", syncAll);

  const r = o.anchor.getBoundingClientRect();
  pop.style.left = `${Math.max(0, r.left)}px`;
  pop.style.top = `${r.bottom}px`;
  document.body.appendChild(pop);

  const close = (): void => {
    pop.remove();
    document.removeEventListener("mousedown", away, true);
    document.removeEventListener("keydown", esc);
  };
  const away = (e: Event): void => { if (!pop.contains(e.target as Node)) close(); };
  const esc = (e: KeyboardEvent): void => { if (e.key === "Escape") close(); };
  document.addEventListener("mousedown", away, true);
  document.addEventListener("keydown", esc);
  pop.addEventListener("click", (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!act) return;
    const checked = boxes().filter((i) => i.checked).map((i) => i.dataset.v!);
    close();
    o.onApply(act === "clear" || checked.length === o.values.length ? null : checked);
  });
  pop.querySelector("input")?.focus();
  return close;
}
