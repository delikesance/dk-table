/** Classification of a displayed cell value: drives alignment (numbers right) and error styling. */
export type CellKind = "num" | "text" | "err";

const ERR = /^#(CYCLE!|DIV\/0!|N\/A|VALUE!|REF!|NAME\?|NUM!|NULL!)$/;
/** fr-FR / en numbers: optional sign, digit groups (space, nbsp, narrow nbsp), decimal , or ., exponent, % or currency suffix. */
const NUM = /^[-+]?\d[\d   ]*(?:[.,]\d+)?(?:[eE][-+]?\d+)?\s*(?:%|[€$£])?$/;

/** Classify a display string as number, error or text. */
export function cellKind(display: string): CellKind {
  const t = display.trim();
  if (ERR.test(t)) return "err";
  return NUM.test(t) ? "num" : "text";
}

const HINTS: Record<string, string> = {
  "#CYCLE!": "Référence circulaire : la formule dépend de sa propre cellule.",
  "#DIV/0!": "Division par zéro.",
  "#N/A": "Valeur non disponible.",
  "#VALUE!": "Type de valeur incorrect pour cette formule.",
  "#REF!": "Référence invalide.",
  "#NAME?": "Nom de fonction inconnu.",
  "#NUM!": "Nombre invalide dans la formule.",
};

/** Set the `dkg-num` / `dkg-err` classes and the error tooltip on a cell element for display text `text`. */
export function markKind(el: HTMLElement, text: string): void {
  const kind = cellKind(text);
  el.classList.toggle("dkg-num", kind === "num");
  el.classList.toggle("dkg-err", kind === "err");
  el.title = kind === "err" ? errorHint(text) : "";
}

/** One-sentence French explanation of an error code (tooltip). */
export function errorHint(code: string): string {
  return HINTS[code.trim()] ?? "Erreur dans la formule.";
}
