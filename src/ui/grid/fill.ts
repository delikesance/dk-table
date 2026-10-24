/**
 * Ctrl+D / Ctrl+R: recopie vers le bas / la droite sur la plage sélectionnée.
 * Les formules sont décalées comme dans Excel (`shiftFormula`): parties relatives déplacées
 * de l'écart source -> cible, parties `$` fixes, référence hors feuille -> `#REF!`.
 */
import { keyOf, type Pos } from "./keys";
import { shiftFormula } from "../../engine/refs";

/** Direction de recopie. */
export type FillDir = "down" | "right";

/**
 * Valeurs à écrire: la première ligne (bas) / colonne (droite) de la plage est recopiée sur le reste.
 * Plage d'une seule ligne/colonne: on recopie la cellule voisine (au-dessus / à gauche), rien en bord.
 * Les lignes masquées (`hidden`) sont ignorées. Ordre: ligne par ligne.
 */
export function fillPlan(
  a: Pos, b: Pos, dir: FillDir, getRaw: (key: string) => string, hidden: (row: number) => boolean = () => false,
): Record<string, string> {
  const [c0, c1] = [Math.min(a.col, b.col), Math.max(a.col, b.col)];
  const [r0, r1] = [Math.min(a.row, b.row), Math.max(a.row, b.row)];
  const down = dir === "down";
  const single = down ? r0 === r1 : c0 === c1;
  if (single && (down ? r0 === 0 : c0 === 0)) return {};
  const srcCol = (c: number): number => (down ? c : single ? c0 - 1 : c0);
  const srcRow = (r: number): number => (!down ? r : single ? r0 - 1 : r0);
  const out: Record<string, string> = {};
  for (let r = r0; r <= r1; r++) {
    if (hidden(r)) continue;
    for (let c = c0; c <= c1; c++) {
      if (!single && (down ? r === r0 : c === c0)) continue; // the source line itself
      const [sc, sr] = [srcCol(c), srcRow(r)];
      out[keyOf(c, r)] = shiftFormula(getRaw(keyOf(sc, sr)), c - sc, r - sr);
    }
  }
  return out;
}
