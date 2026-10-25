/** Classement d'une cellule brute pour le surlignage « formules / constantes » (repérer les valeurs en dur). */
export type RawKind = "formula" | "number" | "text" | "empty";

const NUM = /^[-+]?\d[\d   ]*(?:[.,]\d+)?(?:[eE][-+]?\d+)?\s*%?$/;

/** Formule (`=…`), constante numérique, texte (y compris préfixe `'`) ou vide. */
export function rawKind(raw: string): RawKind {
  const t = raw.trim();
  if (!t) return "empty";
  if (t.startsWith("=")) return "formula";
  if (t.startsWith("'")) return "text";
  return NUM.test(t) ? "number" : "text";
}
