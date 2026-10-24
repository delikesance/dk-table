/** Sidebar docs: second lot of text functions plus date/time, conditional and lookup additions. */
import type { FnDoc } from "./sidebar/sidebar";

/** Text/date/cond/lookup function docs (second lot). */
export const FN_DOCS_TEXT2: FnDoc[] = [
  { name: "CONCATENATE", signature: "CONCATENATE(a; b)", description: "Concaténer du texte" },
  { name: "TEXTJOIN", signature: "TEXTJOIN(séparateur; ignorer_vides; A1:A5)", description: "Joint des textes avec un séparateur" },
  { name: "PROPER", signature: "PROPER(texte)", description: "Majuscule au début de chaque mot" },
  { name: "EXACT", signature: "EXACT(a; b)", description: "Vrai si les deux textes sont identiques (casse comprise)" },
  { name: "SUBSTITUTE", signature: "SUBSTITUTE(texte; ancien; nouveau; n)", description: "Remplace un texte par un autre" },
  { name: "REPLACE", signature: "REPLACE(texte; début; n; nouveau)", description: "Remplace n caractères à partir de début" },
  { name: "FIND", signature: "FIND(cherché; texte; début)", description: "Position d'un texte (sensible à la casse)" },
  { name: "SEARCH", signature: "SEARCH(cherché; texte; début)", description: "Position d'un texte (sans casse; jokers * et ?)" },
  { name: "REPT", signature: "REPT(texte; n)", description: "Répète un texte n fois" },
  { name: "VALUE", signature: "VALUE(texte)", description: "Convertit un texte en nombre" },
  { name: "CHAR", signature: "CHAR(n)", description: "Caractère de code n (1-255)" },
  { name: "CODE", signature: "CODE(texte)", description: "Code du premier caractère" },
  { name: "WEEKDAY", signature: "WEEKDAY(date; type)", description: "Jour de la semaine (type 1 : dimanche = 1)" },
  { name: "EDATE", signature: "EDATE(date; mois)", description: "Date décalée de n mois" },
  { name: "EOMONTH", signature: "EOMONTH(date; mois)", description: "Dernier jour du mois décalé de n mois" },
  { name: "DAYS", signature: "DAYS(fin; début)", description: "Nombre de jours entre deux dates" },
  { name: "NETWORKDAYS", signature: "NETWORKDAYS(début; fin; fériés)", description: "Jours ouvrés (lundi-vendredi) entre deux dates" },
  { name: "TIME", signature: "TIME(heure; minute; seconde)", description: "Heure en fraction de jour" },
  { name: "HOUR", signature: "HOUR(heure)", description: "Heure (0-23)" },
  { name: "MINUTE", signature: "MINUTE(heure)", description: "Minutes (0-59)" },
  { name: "SECOND", signature: "SECOND(heure)", description: "Secondes (0-59)" },
  { name: "AVERAGEIF", signature: "AVERAGEIF(plage; critère; moyenne)", description: "Moyenne des cellules qui respectent le critère" },
  { name: "AVERAGEIFS", signature: "AVERAGEIFS(moyenne; plage; critère)", description: "Moyenne avec plusieurs critères" },
  { name: "MINIFS", signature: "MINIFS(min; plage; critère)", description: "Minimum avec critères" },
  { name: "MAXIFS", signature: "MAXIFS(max; plage; critère)", description: "Maximum avec critères" },
  { name: "CHOOSE", signature: "CHOOSE(n; v1; v2)", description: "La n-ième valeur de la liste" },
];
