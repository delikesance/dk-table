/**
 * Contenu de la barre de menus (refonte Hermes, H3) : le catalogue complet des commandes, à un seul niveau.
 * Chaque libellé n'apparaît qu'une fois ; seules les actions réellement implémentées sont listées.
 * Usage : `createMenuBar(buildMenuSpec(app, deps))`.
 */
import { fileEntries, type Entry, type MenuDef, type MenuHandlers } from "../toolbar/menus";
import { applyTheme, savedThemePref, type ThemePref } from "../theme";
import { BORDER_LABELS } from "../borders";
import { parseKey } from "../grid/keys";
import { insertFecHeaders } from "../fec";
import { freezeEntries } from "../freeze/freezeMenu";
import { openCfDialog } from "../cf/panel";
import { openValidationDialog } from "../validation/panel";
import { toggleKinds } from "../grid/kinds";
import { openTextToColumns } from "../dialogs/textToCols";
import { openNamedFns } from "../dialogs/namedFns";
import { openMerge } from "../dialogs/merge";
import { docFormatMenu, insertionMenu } from "./docSpec";
import type { App } from "../appTypes";

/** Actions de la barre qui ne passent pas par le handle `App` (fichiers, dialogues, macros). */
export interface MenuDeps {
  file: MenuHandlers;
  openSettings(): void;
  /** Ouvre l'éditeur de macros. */
  openMacros(): void;
  /** Macros du classeur, relues à chaque ouverture du menu Scripts. */
  macros(): { id: string; name: string }[];
  runMacro(id: string): void;
  openPalette(): void;
  openAbout(): void;
  autosum(): void;
  /** Ouvre la boîte d'export du document ouvert. */
  exportDoc(): void;
}

/** Entrée radio de thème. */
function theme(label: string, pref: ThemePref, sep = false): Entry {
  return { label, sep, run: () => applyTheme(pref), checked: () => savedThemePref() === pref };
}

/** Fige les lignes au-dessus et les colonnes à gauche du coin haut-gauche de la sélection. */
function freezeAt(app: App): void {
  const p = parseKey(app.selection().split(":")[0]);
  app.setFreeze({ rows: p.row, cols: p.col });
}

/** Entrées du menu Fichier : « Nouveau document » après « Nouveau », « Exporter le document… » quand un document est ouvert. */
function fichier(app: App, d: MenuDeps, inDoc: boolean): MenuDef {
  const e = fileEntries(d.file);
  e.splice(1, 0, { label: "Nouveau document", run: () => void app.addDoc() });
  if (inDoc) e.splice(e.findIndex((x) => x.label === "Enregistrer sous…") + 1, 0, { label: "Exporter le document…", hint: "Ctrl+E", run: d.exportDoc });
  return { label: "Fichier", items: [...e, { label: "Paramètres…", hint: "Ctrl+,", run: d.openSettings, sep: true }] };
}

/** Les menus : 8 dans l'ordre de la maquette validée ; avec un document ouvert, Insertion remplace Feuille et Données. */
export function buildMenuSpec(app: App, d: MenuDeps): MenuDef[] {
  const inDoc = !!app.activeDocId?.();
  const toggle = (k: "bold" | "italic" | "underline" | "wrap") => () => app.style({ [k]: !app.activeStyle()[k] });
  const fmt = (format: string) => () => app.style({ format });
  const vue = { label: "Vue scindée", hint: "Ctrl+\\", sep: true, run: () => app.toggleSplit() };
  const themes = (): Entry[] => [theme("Thème automatique", "auto"), theme("Thème clair", "light"), theme("Thème sombre", "dark")];
  const all: MenuDef[] = [
    fichier(app, d, inDoc),
    { label: "Édition", items: [
      { label: "Annuler", hint: "Ctrl+Z", run: () => app.undo() },
      { label: "Rétablir", hint: "Ctrl+Y", run: () => app.redo() },
      { label: "Effacer le contenu", hint: "Suppr", sep: true,
        run: () => app.editMany(Object.fromEntries(app.selectedKeys().map((k) => [k, ""]))) },
    ] },
    { label: "Format", items: [
      { label: "Gras", hint: "Ctrl+B", run: toggle("bold") },
      { label: "Italique", hint: "Ctrl+I", run: toggle("italic") },
      { label: "Souligné", hint: "Ctrl+U", run: toggle("underline") },
      { label: "Aligner à gauche", sep: true, run: () => app.style({ align: "left" }) },
      { label: "Centrer", run: () => app.style({ align: "center" }) },
      { label: "Aligner à droite", run: () => app.style({ align: "right" }) },
      { label: "Renvoi à la ligne", run: toggle("wrap") },
      ...BORDER_LABELS.map(([m, l], i) => ({ label: `Bordures : ${l.toLowerCase()}`, sep: i === 0, run: () => app.borders(m) })),
      { label: "Formatage conditionnel…", sep: true, run: () => openCfDialog(app) },
      { label: "Standard", sep: true, run: fmt("general") },
      { label: "Nombre", run: fmt("number") },
      { label: "Pourcentage", run: fmt("percent") },
      { label: "Monétaire", run: fmt("currency") },
      { label: "Comptabilité", run: fmt("accounting") },
      { label: "Date", run: fmt("date") },
    ] },
    { label: "Feuille", items: [
      { label: "Nouvelle feuille", run: () => app.addSheet() },
      { label: "Insérer une ligne au-dessus", hint: "Ctrl+Maj+=", sep: true, run: () => app.insertRows() },
      { label: "Insérer une colonne à gauche", run: () => app.insertCols() },
      { label: "Supprimer les lignes", hint: "Ctrl+-", run: () => app.deleteRows() },
      { label: "Supprimer les colonnes", run: () => app.deleteCols() },
    ] },
    { label: "Données", items: [
      { label: "Trier A → Z", run: () => void app.sortColumn(false) },
      { label: "Trier Z → A", run: () => void app.sortColumn(true) },
      { label: "Texte en colonnes…", sep: true, run: () => openTextToColumns(app) },
      { label: "Somme rapide", hint: "Alt+=", run: d.autosum },
      { label: "Validation des données…", run: () => openValidationDialog(app) },
      { label: "Fonctions nommées…", run: () => openNamedFns(app) },
      { label: "Fusionner…", run: () => openMerge(app) },
      { label: "Insérer les en-têtes FEC", sep: true, run: () => insertFecHeaders(app) },
    ] },
    { label: "Scripts", items: () => [
      { label: "Macros", hint: "Alt+F11", run: d.openMacros },
      ...d.macros().map((m, i) => ({ label: m.name, sep: i === 0, run: () => d.runMacro(m.id) })),
    ] },
    { label: "Affichage", items: () => [ // dynamic: "jusqu'à la ligne/colonne" follows the selection (Sheets)
      ...themes(),
      { label: "Figer la première ligne", sep: true, run: () => app.setFreeze({ rows: 1, cols: 0 }) },
      { label: "Figer la première colonne", run: () => app.setFreeze({ rows: 0, cols: 1 }) },
      ...freezeEntries(app, "both"),
      { label: "Figer jusqu'à la cellule active", run: () => freezeAt(app) },
      { label: "Libérer les volets", run: () => app.setFreeze({ rows: 0, cols: 0 }) },
      { label: "Surligner formules / constantes", sep: true, run: () => void toggleKinds() },
      { label: "Panneau des fonctions", run: () => app.toggleSidebar() },
      vue,
    ] },
    { label: "Aide", items: [
      { label: "Rechercher une commande", hint: "Ctrl+K", run: d.openPalette },
      { label: "À propos de dk-table", sep: true, run: d.openAbout },
    ] },
  ];
  if (!inDoc) return all;
  const by = (label: string): MenuDef => all.find((m) => m.label === label)!;
  const edition = by("Édition");
  return [
    by("Fichier"), { label: edition.label, items: (edition.items as Entry[]).slice(0, 2) }, docFormatMenu(app), insertionMenu(app),
    by("Scripts"), { label: "Affichage", items: () => [...themes(), vue] }, by("Aide"),
  ];
}
