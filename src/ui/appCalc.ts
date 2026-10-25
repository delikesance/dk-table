/**
 * Calcul à la demande (F9 = tout le classeur, Maj+F9 = feuille active) et abonnement au mode de calcul.
 * Passer en itératif relance le calcul (les #CYCLE! deviennent des valeurs et inversement) ;
 * le mode manuel ne recalcule rien à lui seul. Rien n'est marqué modifié : le calcul ne change pas les données.
 */
import { recalcWorkbook } from "../engine/workbook";
import { calcMode, onCalcModeChange } from "../engine/calc-mode";
import { refreshCf, syncInfo } from "./appGrid";
import type { Ctx } from "./appState";

/** Méthode `recalc(all)` de l'App ; s'abonne aux changements du mode de calcul pour le classeur courant. */
export function calcApi(c: Ctx): { recalc(all: boolean): void } {
  const redraw = () => { refreshCf(c); c.grid.refresh(); syncInfo(c); };
  let iterative = calcMode().iterative;
  onCalcModeChange((m) => {
    if (m.iterative !== iterative) { iterative = m.iterative; recalcWorkbook(c.cur.sheet, true); }
    redraw();
  });
  return { recalc(all) { recalcWorkbook(c.cur.sheet, all); redraw(); } };
}
