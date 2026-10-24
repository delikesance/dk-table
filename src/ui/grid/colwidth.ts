/** Largeur de colonnes ajustable: maths pures + poignées de redimensionnement des en-têtes. */
import type { GridView } from "./types";

/** Largeur affichée (px) d'une colonne sans largeur mémorisée (= --cell-w). */
export const DEFAULT_W = 96;
const MIN_W = 32;
const MAX_W = 800;
/** Approximation de la largeur d'un caractère (px) et marge intérieure pour l'ajustement au contenu. */
const CHAR_PX = 7;
const PAD_PX = 20;

/** Borne une largeur entre 32 et 800 px. */
export const clampWidth = (w: number): number => Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));

/** Valeur CSS `grid-template-columns`: en-tête de ligne puis une piste par colonne. */
export function templateColumns(widths: Record<number, number>, cols: number): string {
  const tracks = Array.from({ length: cols }, (_, c) => (widths[c] ? `${widths[c]}px` : "var(--cell-w)"));
  return ["var(--row-header-w)", ...tracks].join(" ");
}

/** Largeur qui contient le texte le plus long (estimation sans mesure DOM). */
export function fitWidth(texts: string[]): number {
  const longest = texts.reduce((m, t) => Math.max(m, t.length), 0);
  return clampWidth(longest * CHAR_PX + PAD_PX);
}

/** Hooks de la poignée de redimensionnement. */
export interface ResizeHooks {
  view: GridView;
  /** Textes affichés de la colonne (pour le double-clic). */
  columnTexts(col: number): string[];
  /** Appliquer la nouvelle template de colonnes. */
  apply(): void;
}

/** Ajoute une poignée à chaque en-tête: glisser = largeur, double-clic = ajustement au contenu. */
export function addResizers(heads: HTMLElement[], h: ResizeHooks): void {
  heads.forEach((head, c) => {
    const grip = document.createElement("div");
    grip.className = "dkg-resizer";
    grip.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const x0 = e.clientX;
      const w0 = h.view.widths[c] || head.getBoundingClientRect().width || DEFAULT_W;
      const move = (m: MouseEvent): void => {
        h.view.widths[c] = clampWidth(w0 + m.clientX - x0);
        h.apply();
      };
      const up = (): void => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
    grip.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      h.view.widths[c] = fitWidth(h.columnTexts(c));
      h.apply();
    });
    head.appendChild(grip);
  });
}
