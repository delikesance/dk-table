/**
 * Données > Sous-totaux : écriture du plan sur la sélection, et suppression.
 * Le calcul est dans `engine/subtotalsPlan.ts` ; ici : lecture de la plage, garde-fou (rien d'écrasé
 * sous la sélection), écriture en un pas via `app.editMany`, niveaux via `app.setOutlineLevels`.
 * Le plan appliqué est gardé en mémoire par feuille (`before` = contenu d'origine) pour « Tout supprimer ».
 */
import { parseKey, makeKey } from "../../engine/address";
import { buildSubtotalPlan } from "../../engine/subtotalsPlan";
import type { SubSpec } from "../../engine/subtotals";
import type { App } from "../appTypes";

/** Options du dialogue : colonnes relatives à la sélection (0 = colonne de gauche), en-tête ou non. */
export interface SubtotalOpts extends SubSpec {
  header: boolean;
}

/** Plan appliqué sur une feuille : contenu brut d'origine de la zone écrite. */
interface Applied {
  before: Record<string, string>;
}

const plans = new Map<string, Applied>();

/** Rectangle de la sélection (1-based) ou null si aucune clé valide. */
export function selectionBox(keys: string[]): { row1: number; row2: number; col1: number; col2: number } | null {
  const ps = keys.map(parseKey).filter((p): p is { col: number; row: number } => p !== null);
  if (!ps.length) return null;
  return {
    row1: Math.min(...ps.map((p) => p.row)), row2: Math.max(...ps.map((p) => p.row)),
    col1: Math.min(...ps.map((p) => p.col)), col2: Math.max(...ps.map((p) => p.col)),
  };
}

/**
 * Écrit les sous-totaux sous la sélection (en-tête gardé si demandé). Un plan déjà appliqué sur la
 * feuille est d'abord retiré. Retourne le message d'erreur, ou null si c'est fait.
 */
export function applySubtotals(app: App, o: SubtotalOpts): string | null {
  if (!o.values.length) return "Choisissez au moins une colonne à totaliser.";
  removeSubtotals(app);
  const box = selectionBox(app.selectedKeys());
  if (!box) return "Sélection vide.";
  const raw = app.activeDoc().cells;
  const get = (row: number, col: number): string => raw[makeKey(col, row)]?.raw ?? "";
  const table: string[][] = [];
  for (let r = box.row1; r <= box.row2; r++) {
    const line: string[] = [];
    for (let c = box.col1; c <= box.col2; c++) line.push(get(r, c));
    table.push(line);
  }
  const { rows, levels } = buildSubtotalPlan(table, o.header, o);
  const bottom = box.row1 + rows.length - 1;
  for (let r = box.row2 + 1; r <= bottom; r++) {
    for (let c = box.col1; c <= box.col2; c++) {
      if (get(r, c) !== "") return "Des cellules sous la sélection seraient écrasées.";
    }
  }
  const before: Record<string, string> = {};
  const cells: Record<string, string> = {};
  for (let r = box.row1; r <= bottom; r++) {
    for (let c = box.col1; c <= box.col2; c++) {
      const key = makeKey(c, r);
      before[key] = get(r, c);
      cells[key] = rows[r - box.row1][c - box.col1] ?? "";
    }
  }
  app.editMany(cells);
  const full = new Array<number>(bottom).fill(0);
  levels.forEach((level, i) => (full[box.row1 - 1 + i] = level));
  app.setOutlineLevels(full);
  plans.set(app.activeDocId() ?? "", { before });
  return null;
}

/** Retire les sous-totaux et le plan de la feuille active, en rétablissant son contenu. Faux si aucun plan. */
export function removeSubtotals(app: App): boolean {
  const id = app.activeDocId() ?? "";
  const plan = plans.get(id);
  if (!plan) return false;
  app.editMany(plan.before);
  app.setOutlineLevels([]);
  plans.delete(id);
  return true;
}

/** Oublie les plans gardés en mémoire (tests). */
export function forgetSubtotalPlans(): void {
  plans.clear();
}
