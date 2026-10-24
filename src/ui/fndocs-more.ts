/** Sidebar docs: date, finance, conditional and lookup functions. */
import type { FnDoc } from "./sidebar/sidebar";

/** Date/finance/cond/lookup function docs. */
export const FN_DOCS_MORE: FnDoc[] = [
  { name: "DATE", signature: "DATE(année; mois; jour)", description: "Numéro de série d'une date" },
  { name: "YEAR", signature: "YEAR(date)", description: "Année d'une date" },
  { name: "MONTH", signature: "MONTH(date)", description: "Mois d'une date (1-12)" },
  { name: "DAY", signature: "DAY(date)", description: "Jour d'une date (1-31)" },
  { name: "TODAY", signature: "TODAY()", description: "Date du jour" },
  { name: "NOW", signature: "NOW()", description: "Date et heure actuelles" },
  { name: "PMT", signature: "PMT(taux; nper; va; vc; type)", description: "Mensualité d'un prêt" },
  { name: "NPV", signature: "NPV(taux; A1:A5)", description: "Valeur actuelle nette" },
  { name: "IRR", signature: "IRR(A1:A5; estimation)", description: "Taux de rendement interne (estimation par défaut 10 %)" },
  { name: "SUMIF", signature: "SUMIF(plage; critère; somme)", description: "Somme des cellules qui respectent le critère" },
  { name: "SUMIFS", signature: "SUMIFS(somme; plage; critère)", description: "Somme avec plusieurs critères" },
  { name: "COUNTIF", signature: "COUNTIF(plage; critère)", description: "Compte les cellules qui respectent le critère" },
  { name: "COUNTIFS", signature: "COUNTIFS(plage; critère; plage; critère)", description: "Compte avec plusieurs critères" },
  { name: "VLOOKUP", signature: "VLOOKUP(valeur; table; col; approx)", description: "Recherche verticale" },
  { name: "HLOOKUP", signature: "HLOOKUP(valeur; table; ligne; approx)", description: "Recherche horizontale" },
  { name: "INDEX", signature: "INDEX(plage; ligne; col)", description: "Élément d'une plage (1D seulement)" },
  { name: "MATCH", signature: "MATCH(valeur; plage; type)", description: "Position d'une valeur dans une plage" },
  { name: "XLOOKUP", signature: "XLOOKUP(valeur; recherche; retour; absent)", description: "Recherche exacte, renvoie la valeur correspondante" },
];
