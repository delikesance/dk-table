/** French labels of conditional formatting rules: type names (editor), operators, one-line summaries (list). */
import type { CfKind, CfOp, CfRule, CfTextOp } from "../../engine/cf/types";

/** Type names, in the editor's order. */
export const TYPE_LABELS: Record<CfKind["type"], string> = {
  cell: "Valeur de la cellule", text: "Texte", blank: "Cellules vides", notBlank: "Cellules non vides",
  error: "Erreurs", noError: "Sans erreur", duplicate: "Valeurs en double", unique: "Valeurs uniques",
  top: "Valeurs les plus élevées", bottom: "Valeurs les plus basses", aboveAvg: "Au-dessus de la moyenne",
  belowAvg: "En dessous de la moyenne", formula: "Formule", scale: "Échelle de couleurs", bar: "Barres de données",
};

/** Comparison operators of « Valeur de la cellule » (symbol, editor label). */
export const OP_LABELS: Record<CfOp, [string, string]> = {
  gt: [">", "supérieure à"], ge: ["≥", "supérieure ou égale à"], lt: ["<", "inférieure à"],
  le: ["≤", "inférieure ou égale à"], eq: ["=", "égale à"], ne: ["≠", "différente de"],
  between: ["entre", "comprise entre"], notBetween: ["hors de", "non comprise entre"],
};

/** Text operators (summary wording, editor label). */
export const TEXT_OP_LABELS: Record<CfTextOp, [string, string]> = {
  contains: ["contenant", "contient"], notContains: ["ne contenant pas", "ne contient pas"],
  begins: ["commençant par", "commence par"], ends: ["finissant par", "se termine par"],
};

/** One-line summary of a rule (without its range). */
export function describeRule(r: CfRule): string {
  switch (r.type) {
    case "cell": {
      const [sym] = OP_LABELS[r.op];
      return r.op === "between" || r.op === "notBetween" ? `Valeur ${sym} ${r.a} et ${r.b ?? ""}` : `Valeur ${sym} ${r.a}`;
    }
    case "text": return `Texte ${TEXT_OP_LABELS[r.op][0]} « ${r.text} »`;
    case "top": case "bottom": {
      const end = r.type === "top" ? "élevées" : "basses";
      return r.percent ? `${r.n} % des valeurs les plus ${end}` : `${r.n} valeurs les plus ${end}`;
    }
    case "formula": return `Formule ${r.formula}`;
    case "scale": return `Échelle à ${r.mid ? 3 : 2} couleurs`;
    default: return TYPE_LABELS[r.type];
  }
}
