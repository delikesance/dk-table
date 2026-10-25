/**
 * Indicateur du mode de calcul dans la barre d'état : masqué en calcul automatique,
 * sinon « Manuel · F9 » et/ou « Itératif ». Il suit `calc-mode` en direct.
 * Usage : `const b = createCalcBadge()` ; `b.dispose()` pour se désabonner.
 */
import { calcMode, onCalcModeChange, type CalcMode } from "../../engine/calc-mode";

export interface CalcBadge { el: HTMLElement; dispose(): void }

/** Libellé du mode (vide en automatique). */
function label(m: CalcMode): string {
  const parts: string[] = [];
  if (m.manual) parts.push("Manuel · F9");
  if (m.iterative) parts.push("Itératif");
  return parts.join(" · ");
}

/** Infobulle : réglages de l'itération (ou rappel du recalcul manuel). */
function tip(m: CalcMode): string {
  const lines: string[] = [];
  if (m.manual) lines.push("Calcul manuel : F9 recalcule le classeur, Maj+F9 la feuille active");
  if (m.iterative) lines.push(`Calcul itératif : ${m.maxIter} itérations max, écart max ${m.maxChange}`);
  return lines.join("\n");
}

/** Crée le badge (span) et le tient à jour à chaque changement de réglage. */
export function createCalcBadge(): CalcBadge {
  const el = document.createElement("span");
  el.className = "dk-calc-mode";
  const show = (m: CalcMode) => {
    el.textContent = label(m);
    el.title = tip(m);
    el.hidden = el.textContent === "";
  };
  show(calcMode());
  const off = onCalcModeChange(show);
  return { el, dispose: off };
}
