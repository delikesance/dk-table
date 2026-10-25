/**
 * Mode décimal exact (« comptable ») : option par classeur.
 * Pas de lib : après chaque + - * / ^ le résultat est arrondi à 15 chiffres significatifs
 * (précision d'Excel), ce qui donne 0,1+0,2 = 0,3. `displayGap` repère les écarts
 * « affiché ≠ stocké » (valeur arrondie par le format d'affichage).
 * Usage : `setDecimalMode(true)` (reçoit les abonnés `onDecimalChange`), `fix(x)` dans l'évaluateur.
 */
let on = false;
const listeners: Array<(on: boolean) => void> = [];

/** Vrai si le classeur courant calcule en décimal exact. */
export function decimalMode(): boolean {
  return on;
}

/** Active/désactive le mode ; notifie les abonnés (recalcul) seulement si l'état change. */
export function setDecimalMode(v: boolean): void {
  if (v === on) return;
  on = v;
  for (const f of listeners) f(on);
}

/** S'abonne aux changements du mode (retourne le désabonnement). */
export function onDecimalChange(f: (on: boolean) => void): () => void {
  listeners.push(f);
  return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); };
}

/** En mode décimal : arrondit à 15 chiffres significatifs ; sinon renvoie `n` tel quel. */
export function fix(n: number): number {
  return on && Number.isFinite(n) ? Number(n.toPrecision(15)) : n;
}

/** Décimales affichées par format (percent : 2 décimales du pourcentage = 4 de la valeur). */
const DIGITS: Record<string, number> = { number: 2, currency: 2, accounting: 2, percent: 4 };

/** Vrai si le format d'affichage arrondit `n` (affiché ≠ stocké). */
export function displayGap(n: number, format?: string): boolean {
  const d = format ? DIGITS[format] : undefined;
  if (d === undefined || !Number.isFinite(n)) return false;
  return Number(n.toFixed(d)) !== Number(n.toPrecision(15));
}
