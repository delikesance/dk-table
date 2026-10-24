/** Sidebar docs: math, logic and information functions. */
import type { FnDoc } from "./sidebar/sidebar";

/** Math/logic function docs. */
export const FN_DOCS_MATH: FnDoc[] = [
  { name: "PRODUCT", signature: "PRODUCT(A1:A5)", description: "Produit des nombres" },
  { name: "MOD", signature: "MOD(x; d)", description: "Reste de la division de x par d" },
  { name: "MEDIAN", signature: "MEDIAN(A1:A5)", description: "Médiane (#VALUE! s'il n'y a aucun nombre)" },
  { name: "COUNTA", signature: "COUNTA(A1:A5)", description: "Nombre de cellules non vides" },
  { name: "AND", signature: "AND(a; b)", description: "Vrai si toutes les valeurs sont vraies" },
  { name: "OR", signature: "OR(a; b)", description: "Vrai si au moins une valeur est vraie" },
  { name: "NOT", signature: "NOT(x)", description: "Inverse une valeur logique" },
  { name: "ISNUMBER", signature: "ISNUMBER(x)", description: "Vrai si x est un nombre" },
  { name: "ISBLANK", signature: "ISBLANK(x)", description: "Vrai si x est vide (aussi vrai pour \"\")" },
  { name: "IFERROR", signature: "IFERROR(valeur; si_erreur)", description: "Valeur de repli si la valeur est une erreur" },
  { name: "IFNA", signature: "IFNA(valeur; si_na)", description: "Sans #N/A dans le moteur : renvoie la valeur" },
];
