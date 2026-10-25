/**
 * Poignée de recopie (calculs purs): à partir de la plage source et de la cellule où l'on relâche,
 * produit les valeurs à écrire. Chaque colonne (recopie verticale) ou ligne (horizontale) est prolongée
 * séparément par `extendSeries`; si la source contient une formule, le motif est recopié avec décalage
 * des références (`shiftFormula`).
 */
import { extendSeries } from "../../engine/series";
import { shiftFormula } from "../../engine/refs";
import { keyOf, type Pos } from "./keys";
import type { Sel } from "./nav";

/** Résultat: cellules à écrire (clé -> brut) et nouvelle sélection (source + zone recopiée). */
export interface SeriesPlan { plan: Record<string, string>; sel: Sel }

/**
 * Plan de recopie de la plage `a`..`b` jusqu'à `target` (cellule sous le pointeur).
 * Axe = celui dont le dépassement est le plus grand; cible dans la plage -> rien.
 * `ctrl` inverse série / recopie. `size` borne la zone (feuille entière par défaut: rien au-delà de 0).
 */
export function seriesPlan(
  a: Pos, b: Pos, target: Pos, getRaw: (key: string) => string, ctrl: boolean, size = { cols: Infinity, rows: Infinity },
): SeriesPlan {
  const [c0, c1] = [Math.min(a.col, b.col), Math.max(a.col, b.col)];
  const [r0, r1] = [Math.min(a.row, b.row), Math.max(a.row, b.row)];
  const over = (v: number, lo: number, hi: number): number => (v > hi ? v - hi : v < lo ? v - lo : 0);
  const [dc, dr] = [over(target.col, c0, c1), over(target.row, r0, r1)];
  const none: SeriesPlan = { plan: {}, sel: { anchor: a, active: b } };
  if (!dc && !dr) return none;
  const vertical = Math.abs(dr) >= Math.abs(dc);
  const sign = Math.sign(vertical ? dr : dc);
  const [lo, hi, max] = vertical ? [r0, r1, size.rows - 1] : [c0, c1, size.cols - 1];
  const end = sign > 0 ? Math.min(vertical ? target.row : target.col, max) : Math.max(vertical ? target.row : target.col, 0);
  const n = Math.abs(end - (sign > 0 ? hi : lo));
  if (!n) return none;
  const at = (line: number, i: number): string => (vertical ? keyOf(line, i) : keyOf(i, line));
  const plan: Record<string, string> = {};
  for (let line = vertical ? c0 : r0; line <= (vertical ? c1 : r1); line++) {
    const idx = Array.from({ length: hi - lo + 1 }, (_, k) => (sign > 0 ? lo + k : hi - k)); // sens de la recopie
    const src = idx.map((i) => getRaw(at(line, i)));
    const out = src.some((s) => s.startsWith("="))
      ? Array.from({ length: n }, (_, k) => {
        const from = idx[k % idx.length], to = (sign > 0 ? hi : lo) + sign * (k + 1);
        const d = to - from;
        return shiftFormula(src[k % src.length], vertical ? 0 : d, vertical ? d : 0);
      })
      : extendSeries(src, n, ctrl, sign > 0 ? 1 : -1);
    out.forEach((v, k) => { plan[at(line, (sign > 0 ? hi : lo) + sign * (k + 1))] = v; });
  }
  const far = (sign > 0 ? hi : lo) + sign * n;
  return {
    plan,
    sel: vertical
      ? { anchor: { col: a.col, row: sign > 0 ? r0 : r1 }, active: { col: b.col, row: far } }
      : { anchor: { col: sign > 0 ? c0 : c1, row: a.row }, active: { col: far, row: b.row } },
  };
}

/**
 * Double-clic sur la poignée: dernière ligne à atteindre en descendant, d'après les données contiguës
 * de la colonne voisine (à gauche, sinon à droite). Null si rien à côté de la ligne suivante.
 */
export function autoFillEnd(a: Pos, b: Pos, getRaw: (key: string) => string, rows: number, cols: number): number | null {
  const [c0, c1, r1] = [Math.min(a.col, b.col), Math.max(a.col, b.col), Math.max(a.row, b.row)];
  for (const c of [c0 - 1, c1 + 1]) {
    if (c < 0 || c >= cols) continue;
    let end = r1;
    while (end + 1 < rows && getRaw(keyOf(c, end + 1)) !== "") end++;
    if (end > r1) return end;
  }
  return null;
}
