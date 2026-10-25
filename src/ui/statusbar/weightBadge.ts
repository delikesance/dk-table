/**
 * Indicateur de poids du classeur, affiché en continu dans la barre d'état (« 12 000 cellules · 180 Ko »).
 * Le niveau (data-level) colore l'indicateur ; l'infobulle dit ce que le niveau implique pour la performance.
 * Usage : `const w = createWeightBadge(); w.update(raws)` à chaque modification (raws = valeurs brutes).
 */
import { formatBytes, sheetWeight, type WeightLevel } from "../../engine/weight";

export interface WeightBadge { el: HTMLElement; update(raws: Iterable<string>): void }

/** Phrase d'infobulle par niveau : ce que le poids implique (aucun blocage, jamais de plafond). */
const TIPS: Record<WeightLevel, string> = {
  leger: "Classeur léger : aucune gêne attendue",
  lourd: "Classeur lourd : le recalcul et le défilement peuvent ralentir",
  "tres-lourd": "Classeur très lourd : recalcul et enregistrement peuvent être longs",
};

/** Crée l'indicateur (span) ; il ne se masque jamais. */
export function createWeightBadge(): WeightBadge {
  const el = document.createElement("span");
  el.className = "dk-weight";
  return {
    el,
    update(raws) {
      const w = sheetWeight(raws);
      el.textContent = `${w.cells.toLocaleString("fr-FR")} cellules · ${formatBytes(w.bytes)}`;
      el.dataset.level = w.level;
      el.title = TIPS[w.level];
    },
  };
}
