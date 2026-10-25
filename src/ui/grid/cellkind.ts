import { rawKind, type RawKind } from "../../engine/audit-kinds";
import { LONG_HINT } from "../../engine/longnum";
export { rawKind };

/** Classification of a displayed cell value: drives alignment (numbers right) and error styling. */
export type CellKind = "num" | "text" | "err";

const ERR = /^#(CYCLE!|DIV\/0!|N\/A|VALUE!|REF!|NAME\?|NUM!|NULL!|SPILL!)$/;
/** fr-FR / en numbers: optional sign, digit groups (space, nbsp, narrow nbsp), decimal , or ., exponent, % or currency suffix. */
const NUM = /^[-+]?\d[\d   ]*(?:[.,]\d+)?(?:[eE][-+]?\d+)?\s*(?:%|[€$£])?$/;

/** Accounting zero ("- €"), shown by the "Comptabilité" format. */
const ACC_ZERO = /^-\s*€$/;

/** Classify a display string as number, error or text; accounting "(1 234,50 €)" and "- €" are numbers (right-aligned). */
export function cellKind(display: string): CellKind {
  const t = display.trim();
  if (ERR.test(t)) return "err";
  const inner = /^\((.+)\)$/.exec(t)?.[1] ?? t;
  return NUM.test(inner) || ACC_ZERO.test(t) ? "num" : "text";
}

const HINTS: Record<string, string> = {
  "#CYCLE!": "Référence circulaire : la formule dépend de sa propre cellule.",
  "#DIV/0!": "Division par zéro.",
  "#N/A": "Valeur non disponible.",
  "#VALUE!": "Type de valeur incorrect pour cette formule.",
  "#REF!": "Référence invalide.",
  "#NAME?": "Nom de fonction inconnu.",
  "#NUM!": "Nombre invalide dans la formule.",
  "#SPILL!": "Débordement bloqué : une cellule de la zone n'est pas vide.",
};

/**
 * Set the `dkg-num` / `dkg-err` classes and the error tooltip on a cell element for display text `text`;
 * `dkg-ml` marks multi-line text (Alt+Enter) so only those cells wrap with pre-wrap.
 */
export function markKind(el: HTMLElement, text: string, gap?: string, raw?: RawKind): void {
  el.classList.toggle("dkg-kf", raw === "formula"); // surlignage formules / constantes (voir kinds.ts)
  el.classList.toggle("dkg-kc", raw === "number");
  el.classList.toggle("dkg-ml", text.includes("\n"));
  const kind = cellKind(text);
  el.classList.toggle("dkg-num", kind === "num");
  el.classList.toggle("dkg-err", kind === "err");
  el.classList.toggle("dkg-long", raw === "long"); // identifiant > 15 chiffres gardé en texte exact
  el.title = kind === "err" ? errorHint(text) : raw === "long" ? LONG_HINT : gap ?? "";
  el.classList.toggle("dkg-gap", !!gap && kind !== "err"); // affiché ≠ stocké (mode décimal)
}

/** One-sentence French explanation of an error code (tooltip). */
export function errorHint(code: string): string {
  return HINTS[code.trim()] ?? "Erreur dans la formule.";
}
