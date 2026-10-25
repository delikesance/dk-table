/** Identifiants longs : saisies numériques de plus de 15 chiffres significatifs, gardées en texte exact. */

/** Infobulle de la cellule signalée. */
export const LONG_HINT = "Identifiant long : stocké en texte exact (>15 chiffres)";

const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/**
 * Vrai si `raw` est un entier/décimal sans exposant avec plus de 15 chiffres significatifs
 * (signe et zéros de tête ignorés). Un nombre double perdrait ces chiffres (Excel les met à zéro).
 */
export function isLongNumber(raw: string): boolean {
  const t = raw.trim();
  if (!PLAIN.test(t)) return false;
  return t.replace(/^[+-]/, "").replace(".", "").replace(/^0+/, "").length > 15;
}
