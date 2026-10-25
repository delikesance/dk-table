/**
 * Mode de calcul du classeur : automatique (défaut), manuel (recalcul sur F9) et itératif
 * (références circulaires recalculées jusqu'à convergence au lieu de #CYCLE!).
 * Module pur : `setCalcMode` normalise les réglages et notifie les abonnés si l'état change.
 * Usage : `calcMode()` dans recalc/sheet ; `onCalcModeChange` pour recalculer l'UI.
 */

/** Réglages de calcul. `maxChange` : écart maximal entre deux itérations pour arrêter. */
export interface CalcMode {
  manual: boolean;
  iterative: boolean;
  maxIter: number;
  maxChange: number;
}

/** Valeurs par défaut (automatique, sans itérations ; 100 itérations, écart 0,001 si activé). */
export const DEFAULT_CALC: CalcMode = { manual: false, iterative: false, maxIter: 100, maxChange: 0.001 };

let current: CalcMode = { ...DEFAULT_CALC };
const listeners: Array<(m: CalcMode) => void> = [];

/** Réglages courants (objet à ne pas modifier). */
export function calcMode(): CalcMode {
  return current;
}

/** Ramène les réglages dans leurs bornes : itérations entières >= 1, écart > 0. */
function normalize(m: CalcMode): CalcMode {
  const maxIter = Math.max(1, Math.floor(m.maxIter));
  const maxChange = m.maxChange > 0 && Number.isFinite(m.maxChange) ? m.maxChange : DEFAULT_CALC.maxChange;
  return { manual: !!m.manual, iterative: !!m.iterative, maxIter: Number.isFinite(maxIter) ? maxIter : DEFAULT_CALC.maxIter, maxChange };
}

/** Modifie une partie des réglages ; les abonnés ne sont prévenus que si quelque chose change. */
export function setCalcMode(patch: Partial<CalcMode>): void {
  const next = normalize({ ...current, ...patch });
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  for (const f of listeners) f(current);
}

/** S'abonne aux changements (retourne le désabonnement). */
export function onCalcModeChange(f: (m: CalcMode) => void): () => void {
  listeners.push(f);
  return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); };
}
