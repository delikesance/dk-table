/** Classement d'une cellule brute pour le surlignage « formules / constantes » (repérer les valeurs en dur). */
import { isLongNumber } from "./longnum";
export type RawKind = "formula" | "number" | "long" | "text" | "empty";

const NUM = /^[-+]?\d[\d   ]*(?:[.,]\d+)?(?:[eE][-+]?\d+)?\s*%?$/;

/** Formule (`=…`), constante numérique, identifiant long (>15 chiffres), texte (y compris préfixe `'`) ou vide. */
export function rawKind(raw: string): RawKind {
  const t = raw.trim();
  if (!t) return "empty";
  if (t.startsWith("=")) return "formula";
  if (t.startsWith("'")) return "text";
  if (isLongNumber(t)) return "long";
  return NUM.test(t) ? "number" : "text";
}
