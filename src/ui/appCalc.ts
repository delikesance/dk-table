/**
 * Calcul à la demande (F9 = tout le classeur, Maj+F9 = feuille active) et abonnement au mode de calcul.
 * Passer en itératif relance le calcul (les #CYCLE! deviennent des valeurs et inversement) ;
 * le mode manuel ne recalcule rien à lui seul. Rien n'est marqué modifié : le calcul ne change pas les données.
 */
import { recalcWorkbook } from "../engine/workbook";
import { DEFAULT_CALC, calcMode, onCalcModeChange, setCalcMode } from "../engine/calc-mode";
import { calcToDoc } from "../io/calcFormat";
import type { DktDoc } from "../io/types";
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

/** Champ `calc` du document pour l'enregistrement (vide si mode par défaut). */
export function calcField(): Pick<DktDoc, "calc"> {
  const calc = calcToDoc(calcMode());
  return calc ? { calc } : {};
}

/** Applique le mode de calcul d'un document ouvert (automatique s'il n'en a pas), avant de construire ses feuilles. */
export function loadCalc(doc: DktDoc): void {
  setCalcMode(doc.calc ?? DEFAULT_CALC);
}
