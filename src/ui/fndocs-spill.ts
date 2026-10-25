/** Sidebar docs: functions whose result spills over neighbouring cells (SPLIT, UNIQUE, FILTER, SORT). */
import type { FnDoc } from "./sidebar/sidebar";

/** Spill function docs. */
export const FN_DOCS_SPILL: FnDoc[] = [
  { name: "SPLIT", signature: "SPLIT(texte; séparateur)", description: "Découpe un texte en cellules voisines (déborde à droite)" },
  { name: "UNIQUE", signature: "UNIQUE(A1:A10)", description: "Lignes distinctes (déborde vers le bas)" },
  { name: "FILTER", signature: "FILTER(A1:B10; B1:B10>5)", description: "Lignes où la condition est vraie; aucune : #N/A" },
  { name: "SORT", signature: "SORT(A1:B10; colonne; croissant)", description: "Lignes triées sur une colonne (colonne 1, VRAI par défaut)" },
];
