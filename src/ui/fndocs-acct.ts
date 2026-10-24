/** Sidebar docs: depreciation, accounting dates/rounding, SUBTOTAL and AGGREGATE. */
import type { FnDoc } from "./sidebar/sidebar";

/** Accounting function docs. */
export const FN_DOCS_ACCT: FnDoc[] = [
  { name: "SLN", signature: "SLN(coût; valeur_rés; durée)", description: "Amortissement linéaire par période" },
  { name: "SYD", signature: "SYD(coût; valeur_rés; durée; période)", description: "Amortissement selon la somme des années" },
  { name: "DB", signature: "DB(coût; valeur_rés; durée; période; mois)", description: "Amortissement dégressif à taux fixe (mois de la 1re année, 12 par défaut)" },
  { name: "DDB", signature: "DDB(coût; valeur_rés; durée; période; facteur)", description: "Amortissement dégressif à taux double (facteur 2 par défaut)" },
  { name: "VDB", signature: "VDB(coût; valeur_rés; durée; début; fin; facteur; sans_bascule)", description: "Amortissement dégressif entre deux périodes, bascule en linéaire sauf si sans_bascule = VRAI" },
  { name: "AMORLINC", signature: "AMORLINC(coût; achat; 1re_période; valeur_rés; période; taux; base)", description: "Amortissement linéaire comptable français, 1re période au prorata" },
  { name: "AMORDEGRC", signature: "AMORDEGRC(coût; achat; 1re_période; valeur_rés; période; taux; base)", description: "Amortissement dégressif comptable français (coefficient selon la durée, arrondi à l'unité)" },
  { name: "MROUND", signature: "MROUND(nombre; multiple)", description: "Arrondi au multiple le plus proche (#NUM! si signes opposés)" },
  { name: "YEARFRAC", signature: "YEARFRAC(début; fin; base)", description: "Fraction d'année entre deux dates (bases 0 à 4)" },
  { name: "DAYS360", signature: "DAYS360(début; fin; méthode)", description: "Jours entre deux dates sur une année de 360 jours (VRAI = méthode européenne)" },
  { name: "SUBTOTAL", signature: "SUBTOTAL(code; A1:A5)", description: "Sous-total : 1-11 ou 101-111 (moyenne, nombre, somme...)" },
  { name: "AGGREGATE", signature: "AGGREGATE(code; options; A1:A5; k)", description: "Agrégat 1-19, options 2, 3, 6, 7 : ignore les erreurs" },
];
