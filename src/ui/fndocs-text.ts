/** Sidebar docs: text functions. */
import type { FnDoc } from "./sidebar/sidebar";

/** Text function docs. */
export const FN_DOCS_TEXT: FnDoc[] = [
  { name: "LEFT", signature: "LEFT(texte; n)", description: "Les n premiers caractères" },
  { name: "RIGHT", signature: "RIGHT(texte; n)", description: "Les n derniers caractères" },
  { name: "MID", signature: "MID(texte; début; n)", description: "Extrait n caractères à partir de la position début" },
  { name: "LEN", signature: "LEN(texte)", description: "Nombre de caractères" },
  { name: "TRIM", signature: "TRIM(texte)", description: "Supprime les espaces superflus" },
  { name: "UPPER", signature: "UPPER(texte)", description: "Texte en majuscules" },
  { name: "LOWER", signature: "LOWER(texte)", description: "Texte en minuscules" },
  { name: "TEXT", signature: "TEXT(x; format)", description: "Formate un nombre en texte" },
];
