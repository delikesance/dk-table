/** Function reference shown in the sidebar (engine builtins + live charts). */
import type { FnDoc } from "./sidebar/sidebar";
import { FN_DOCS_MATH } from "./fndocs-math";
import { FN_DOCS_TEXT } from "./fndocs-text";
import { FN_DOCS_MORE } from "./fndocs-more";
import { FN_DOCS_MATH2 } from "./fndocs-math2";
import { FN_DOCS_TEXT2 } from "./fndocs-text2";

/** Documented functions; `name` is inserted as `=NAME(`. */
export const FN_DOCS: FnDoc[] = [
  { name: "SUM", signature: "SUM(A1:A5)", description: "Somme des nombres" },
  { name: "AVERAGE", signature: "AVERAGE(A1:A5)", description: "Moyenne" },
  { name: "MIN", signature: "MIN(A1:A5)", description: "Plus petite valeur" },
  { name: "MAX", signature: "MAX(A1:A5)", description: "Plus grande valeur" },
  { name: "COUNT", signature: "COUNT(A1:A5)", description: "Nombre de valeurs numériques" },
  { name: "ABS", signature: "ABS(x)", description: "Valeur absolue" },
  { name: "ROUND", signature: "ROUND(x; n)", description: "Arrondi à n décimales" },
  { name: "CONCAT", signature: "CONCAT(a; b)", description: "Concaténer du texte" },
  { name: "IF", signature: "IF(test; oui; non)", description: "Condition" },
  { name: "SPARKLINE", signature: "SPARKLINE(A1:A5)", description: "Courbe dans la cellule" },
  { name: "BAR", signature: "BAR(A1:A5)", description: "Mini-barres dans la cellule" },
  { name: "TREND", signature: "TREND(A1:A5)", description: "Flèche de tendance et %" },
  ...FN_DOCS_MATH,
  ...FN_DOCS_TEXT,
  ...FN_DOCS_MORE,
  ...FN_DOCS_MATH2,
  ...FN_DOCS_TEXT2,
];
