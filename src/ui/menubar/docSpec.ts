/** Menus Format et Insertion quand un document est ouvert : agissent sur le texte et les liens du document. */
import type { MenuDef } from "../toolbar/menus";
import type { App } from "../appTypes";
import type { DocFormat } from "../../doc/commands";

/** Format du document : marques, titres, listes, citation. */
export function docFormatMenu(app: App): MenuDef {
  const f = (label: string, name: DocFormat, hint?: string, sep = false) => ({ label, hint, sep, run: () => app.docFormat(name) });
  return { label: "Format", items: [
    f("Gras", "strong", "Ctrl+B"), f("Italique", "em", "Ctrl+I"), f("Souligné", "underline", "Ctrl+U"),
    f("Paragraphe", "p", "Ctrl+Alt+0", true), f("Titre 1", "h1", "Ctrl+Alt+1"), f("Titre 2", "h2", "Ctrl+Alt+2"), f("Titre 3", "h3", "Ctrl+Alt+3"),
    f("Liste à puces", "bullet", undefined, true), f("Liste numérotée", "ordered"), f("Citation", "quote"),
  ] };
}

/** Insertion : cellule liée (@), tableau lié, graphiques liés (plage sélectionnée de la feuille active). */
export function insertionMenu(app: App): MenuDef {
  return { label: "Insertion", items: [
    { label: "Cellule liée", hint: "@", run: () => app.docInsert("cell") },
    { label: "Calcul", hint: "=", run: () => app.docInsert("calc") },
    { label: "Tableau lié", sep: true, run: () => app.docInsert("table") },
    { label: "Graphique en barres lié", run: () => app.docInsert("bar") },
    { label: "Graphique de tendance lié", run: () => app.docInsert("trend") },
  ] };
}
