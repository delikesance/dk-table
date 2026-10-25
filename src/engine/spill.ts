/**
 * Débordement (spill) : une formule de tête renvoie une matrice, déversée dans les cellules
 * voisines (valeurs seules, sans texte brut). Bloquée par une cellule non vide ou le bord de
 * la feuille -> `#SPILL!` dans la cellule de tête. Les cellules déversées sont suivies dans
 * `State.spills` pour être libérées au recalcul et pour détecter une saisie qui bloque.
 */
import { err, type Sheet, type Value } from "./types";
import { inBounds, makeKey, parseKey } from "./address";
import type { SpillResult } from "./fn-spill";
import type { State } from "./state";

/** Écrit la valeur d'une cellule déversée et recalcule ses dépendants (fourni par recalc.ts). */
/** `v` absent = recalculer la cellule normalement (elle a un contenu propre). */
export type Touch = (key: string, v?: Value) => void;

/** Libère la zone déversée précédente de `origin` (cellules vidées, dépendants recalculés). */
export function releaseSpill(sheet: Sheet, st: State, origin: string, touch: Touch): void {
  const old = st.spills.get(origin);
  if (!old) return;
  st.spills.delete(origin);
  for (const k of old.live) touch(k, (sheet.cells[k]?.raw ?? "") === "" ? "" : undefined);
}

/**
 * Déverse `res` depuis `origin` (déjà libérée) ; renvoie la valeur de la cellule de tête.
 * Erreur ou zone bloquée : tête en erreur, rectangle mémorisé pour détecter le déblocage.
 */
export function applySpill(sheet: Sheet, st: State, origin: string, res: SpillResult, touch: Touch): Value {
  if (!Array.isArray(res)) return res;
  const o = parseKey(origin)!;
  const rect: string[] = [];
  res.forEach((row, r) => row.forEach((_, c) => rect.push(makeKey(o.col + c, o.row + r))));
  const rest = rect.slice(1);
  const blocked = rest.some((k) => !inBounds(sheet, k) || (sheet.cells[k]?.raw ?? "") !== "")
    || !inBounds(sheet, rect[rect.length - 1]);
  if (blocked) {
    st.spills.set(origin, { rect, live: [] });
    return err("#SPILL!");
  }
  st.spills.set(origin, { rect, live: rest });
  res.forEach((row, r) => row.forEach((v, c) => {
    if (r || c) touch(makeKey(o.col + c, o.row + r), v);
  }));
  return res[0]?.[0] ?? "";
}

/** Têtes dont le rectangle (déversé ou bloqué) contient `key` (hors la tête elle-même). */
export function spillOwners(st: State, key: string): string[] {
  const out: string[] = [];
  for (const [o, s] of st.spills) if (o !== key && s.rect.includes(key)) out.push(o);
  return out;
}
