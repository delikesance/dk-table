/**
 * Boutons du plan (VUE): +/- dans la marge de l'en-tête de ligne, boutons de niveaux 1 à 3 dans le coin.
 * Aucune donnée n'est modifiée: les clics passent par `gridOutline.ts`, qui met à jour `GridView.outline`.
 */
import { groupStart, type Outline } from "../../engine/outline";

/** Niveaux d'affichage proposés dans le coin (bouton k = niveaux 0 à k-1 visibles). */
export const LEVEL_BUTTONS = [1, 2, 3];

/** État du +/- d'une ligne: null sans détail au-dessus, sinon "open" (+ à replier) ou "closed". */
export function foldState(o: Outline, row: number): "open" | "closed" | null {
  if (groupStart(o, row) === row) return null;
  return o.collapsed.some((f) => f.row === row) ? "closed" : "open";
}

/** Vrai si au moins une ligne a un niveau de plan (sinon les boutons de niveaux sont inutiles). */
export function hasOutline(o: Outline | undefined): boolean {
  return !!o && o.levels.some((l) => l > 0);
}

/** Crée (ou remplace) le bouton +/- d'un en-tête de ligne; `null` retire le bouton. */
export function setFoldButton(head: HTMLElement, row: number, state: "open" | "closed" | null, onClick: () => void): void {
  head.querySelector(".dkg-fold")?.remove();
  if (state === null) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "dkg-fold";
  b.dataset.row = String(row);
  b.textContent = state === "open" ? "−" : "+";
  b.setAttribute("aria-expanded", String(state === "open"));
  b.setAttribute("aria-label", `${state === "open" ? "Replier" : "Déplier"} les lignes au-dessus de la ligne ${row + 1}`);
  // Le clic et la frappe restent sur le bouton: ni sélection de ligne ni édition de la cellule.
  b.addEventListener("mousedown", (e) => e.stopPropagation());
  b.addEventListener("keydown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  head.appendChild(b);
}

/** Crée les boutons de niveaux 1 à 3 dans le coin; `onLevel(k)` reçoit le bouton (1 à 3). */
export function addLevelButtons(corner: HTMLElement, onLevel: (k: number) => void): HTMLElement[] {
  const bar = document.createElement("div");
  bar.className = "dkg-lvls";
  const buttons = LEVEL_BUTTONS.map((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dkg-lvl";
    b.dataset.level = String(k);
    b.textContent = String(k);
    b.setAttribute("aria-label", `Afficher le niveau ${k}`);
    b.addEventListener("mousedown", (e) => e.stopPropagation());
    b.addEventListener("keydown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); onLevel(k); });
    bar.appendChild(b);
    return b;
  });
  corner.appendChild(bar);
  return buttons;
}
