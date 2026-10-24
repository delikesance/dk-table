/**
 * Contenu de la barre de menus (refonte Hermes, H3) : le catalogue complet des commandes, à un seul niveau.
 * Chaque libellé n'apparaît qu'une fois ; seules les actions réellement implémentées sont listées.
 * Usage : `createMenuBar(buildMenuSpec(app, deps))`.
 */
import { fileEntries, type Entry, type MenuDef, type MenuHandlers } from "../toolbar/menus";
import { applyTheme, savedThemePref, type ThemePref } from "../theme";
import { BORDER_LABELS } from "../borders";
import { parseKey } from "../grid/keys";
import { openCfDialog } from "../cf/panel";
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

/** Les 8 menus, dans l'ordre de la maquette validée. */
export function buildMenuSpec(app: App, d: MenuDeps): MenuDef[] {
  const toggle = (k: "bold" | "italic" | "underline" | "wrap") => () => app.style({ [k]: !app.activeStyle()[k] });
  const fmt = (format: string) => () => app.style({ format });
  return [
    { label: "Fichier", items: [...fileEntries(d.file), { label: "Paramètres…", hint: "Ctrl+,", run: d.openSettings, sep: true }] },
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
      { label: "Somme rapide", hint: "Alt+=", sep: true, run: d.autosum },
    ] },
    { label: "Scripts", items: () => [
      { label: "Éditeur de macros", hint: "Alt+F11", run: d.openMacros },
      ...d.macros().map((m, i) => ({ label: m.name, sep: i === 0, run: () => d.runMacro(m.id) })),
    ] },
    { label: "Affichage", items: [
      theme("Thème automatique", "auto"), theme("Thème clair", "light"), theme("Thème sombre", "dark"),
      { label: "Figer la première ligne", sep: true, run: () => app.setFreeze({ rows: 1, cols: 0 }) },
      { label: "Figer la première colonne", run: () => app.setFreeze({ rows: 0, cols: 1 }) },
      { label: "Figer jusqu'à la cellule active", run: () => freezeAt(app) },
      { label: "Libérer les volets", run: () => app.setFreeze({ rows: 0, cols: 0 }) },
      { label: "Panneau des fonctions", sep: true, run: () => app.toggleSidebar() },
    ] },
    { label: "Aide", items: [
      { label: "Rechercher une commande", hint: "Ctrl+K", run: d.openPalette },
      { label: "À propos de dk-table", sep: true, run: d.openAbout },
    ] },
  ];
}
