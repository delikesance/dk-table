/**
 * Poids d'un classeur (pur, sans DOM) : cellules non vides, caractères saisis, niveau léger / lourd / très lourd.
 * Sert à l'indicateur de la barre d'état : aucun plafond, seulement une information sur le coût de calcul.
 * Usage : `sheetWeight(Object.values(sheet.cells).map((c) => c.raw))`.
 */

/** Au-delà de ce nombre de cellules non vides, le classeur est « lourd » (même seuil que l'import volumineux). */
export const WEIGHT_WARN_CELLS = 200_000;
/** Au-delà de ce nombre de cellules non vides, le classeur est « très lourd ». */
export const WEIGHT_HEAVY_CELLS = 1_000_000;
/** Au-delà de ce total de caractères, le classeur est « très lourd » (texte volumineux). */
export const WEIGHT_HEAVY_CHARS = 10_000_000;

/** Niveau de poids : léger, lourd (recalcul/défilement peuvent ralentir), très lourd. */
export type WeightLevel = "leger" | "lourd" | "tres-lourd";

/** Poids mesuré : cellules non vides, caractères, octets estimés (≈ caractères, ASCII), niveau. */
export interface Weight { cells: number; chars: number; bytes: number; level: WeightLevel }

/** Mesure le poids d'un classeur à partir des valeurs brutes de ses cellules. Les vides ne comptent pas. */
export function sheetWeight(raws: Iterable<string>): Weight {
  let cells = 0, chars = 0;
  for (const raw of raws) {
    if (raw === "") continue;
    cells++;
    chars += raw.length;
  }
  const level: WeightLevel = cells > WEIGHT_HEAVY_CELLS || chars > WEIGHT_HEAVY_CHARS ? "tres-lourd"
    : cells > WEIGHT_WARN_CELLS ? "lourd" : "leger";
  return { cells, chars, bytes: chars, level };
}

/** Taille lisible en français : « 12 o », « 1,5 Ko », « 1,2 Mo ». */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`;
  return `${(n / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
