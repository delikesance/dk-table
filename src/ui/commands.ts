/** Palette commands, keyboard shortcuts and the cell context menu. */
import { registerCommand } from "./palette/registry";
import { showContextMenu, type MenuItem } from "./contextmenu/contextmenu";
import type { App } from "./appTypes";
import { autosum } from "./autosum";
import { BORDER_LABELS } from "./borders";
import { parseKey } from "./grid/keys";
import { exportCsv, importCsv, newDocument, openFile, openRecent, saveFile } from "./fileops";

/** Click the discreet tools toggle (single source of truth for the deployed state + persistence). */
function toggleTools(): void {
  document.querySelector<HTMLButtonElement>('[data-action="toggle-tools"]')?.click();
}

/** Keyboard shortcuts (Ctrl/Cmd + key) -> action. Ctrl+K is owned by the palette. */
function shortcuts(app: App): Record<string, (e: KeyboardEvent) => void> {
  return {
    z: (e) => (e.shiftKey ? app.redo() : app.undo()),
    y: () => app.redo(),
    b: () => app.style({ bold: !app.activeStyle().bold }),
    i: () => app.style({ italic: !app.activeStyle().italic }),
    u: () => app.style({ underline: !app.activeStyle().underline }),
    o: () => void openFile(app),
    s: (e) => void saveFile(app, e.shiftKey),
    n: () => newDocument(app),
    j: () => toggleTools(),
    "+": () => app.insertRows(),
    "-": () => app.deleteRows(),
  };
}

/** Freeze rows above and columns left of the selection's top-left cell (the active cell for a single cell). */
function freezeAtCell(app: App): void {
  const p = parseKey(app.selection().split(":")[0]);
  app.setFreeze({ rows: p.row, cols: p.col });
}

/** Clear selected cells as a single undo step. */
function clearSelection(app: App): void {
  app.editMany(Object.fromEntries(app.selectedKeys().map((k) => [k, ""])));
}

/** Insert/delete rows/cols entries (context menu + palette share labels). */
const STRUCTURE = [
  ["struct.insert-row", "Insérer une ligne au-dessus", "insertRows", "Ctrl+Maj+="],
  ["struct.insert-col", "Insérer une colonne à gauche", "insertCols", undefined],
  ["struct.delete-rows", "Supprimer les lignes", "deleteRows", "Ctrl+-"],
  ["struct.delete-cols", "Supprimer les colonnes", "deleteCols", undefined],
] as const;

/** Context menu entries for structural edits. */
function structureItems(app: App): MenuItem[] {
  return STRUCTURE.map(([, label, m, shortcut]) => ({ label, shortcut, action: () => app[m]() }));
}

/** Context menu items for the grid. */
function cellMenu(app: App): MenuItem[] {
  return [
    { label: "Gras", shortcut: "Ctrl+B", action: () => app.style({ bold: !app.activeStyle().bold }) },
    { label: "Italique", shortcut: "Ctrl+I", action: () => app.style({ italic: !app.activeStyle().italic }) },
    { separator: true },
    { label: "Alignement", submenu: (["left", "center", "right"] as const).map((a) => ({
      label: { left: "Gauche", center: "Centre", right: "Droite" }[a], action: () => app.style({ align: a }) })) },
    { separator: true },
    { label: "Trier A→Z", icon: "sort-asc", action: () => void app.sortColumn(false) },
    { label: "Trier Z→A", icon: "sort-desc", action: () => void app.sortColumn(true) },
    { separator: true },
    ...structureItems(app),
    { separator: true },
    { label: "Effacer le contenu", danger: true, action: () => clearSelection(app) },
    { label: "Annuler", shortcut: "Ctrl+Z", action: () => app.undo() },
  ];
}

/** True when the event target is an editable text field (input, textarea, contenteditable). */
function inTextField(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true || !!el.closest?.(".cm-editor"));
}

/** Current global keydown listener, replaced on each install. */
let onKey: ((e: KeyboardEvent) => void) | null = null;

/** Register palette commands, global shortcuts, context menu and file command hooks (a remount replaces the keydown listener). */
export function installCommands(app: App): void {
  const run = (id: string, label: string, fn: () => void, shortcut?: string, keywords: string[] = []) =>
    registerCommand({ id, label, run: fn, shortcut, keywords });
  run("file.open", "Ouvrir un fichier", () => void openFile(app), "Ctrl+O");
  run("file.save", "Enregistrer", () => void saveFile(app), "Ctrl+S");
  run("file.saveas", "Enregistrer sous", () => void saveFile(app, true), "Ctrl+Shift+S");
  run("file.import", "Importer un CSV", () => void importCsv(app), undefined, ["csv"]);
  run("file.export", "Exporter en CSV", () => void exportCsv(app), undefined, ["csv"]);
  run("edit.undo", "Annuler", () => app.undo(), "Ctrl+Z");
  run("edit.redo", "Rétablir", () => app.redo(), "Ctrl+Y");
  run("format.bold", "Gras", () => app.style({ bold: !app.activeStyle().bold }), "Ctrl+B");
  run("format.italic", "Italique", () => app.style({ italic: !app.activeStyle().italic }), "Ctrl+I");
  run("format.underline", "Souligné", () => app.style({ underline: !app.activeStyle().underline }), "Ctrl+U");
  run("format.wrap", "Renvoi à la ligne", () => app.style({ wrap: !app.activeStyle().wrap }), undefined, ["wrap", "retour"]);
  for (const [m, l] of BORDER_LABELS) run(`format.borders-${m}`, `Bordures : ${l.toLowerCase()}`, () => app.borders(m), undefined, ["bordure", "border"]);
  run("file.new", "Nouveau", () => newDocument(app), "Ctrl+N", ["document"]);
  run("edit.autosum", "Somme rapide", () => void autosum(app), "Alt+=", ["somme", "sum", "total", "sigma"]);
  run("data.sort-asc", "Trier la colonne A→Z", () => void app.sortColumn(false), undefined, ["tri", "sort", "croissant"]);
  run("data.sort-desc", "Trier la colonne Z→A", () => void app.sortColumn(true), undefined, ["tri", "sort", "décroissant"]);
  run("sheet.add", "Nouvelle feuille", () => app.addSheet());
  run("view.sidebar", "Afficher/masquer le panneau latéral", () => app.toggleSidebar());
  run("view.tools", "Afficher/Masquer les outils", toggleTools, "Ctrl+J", ["barre", "outils", "toolbar"]);
  for (const [id, label, m, sc] of STRUCTURE) run(id, label, () => app[m](), sc, ["ligne", "colonne", "insérer", "supprimer"]);
  const fk = ["figer", "volets", "freeze", "geler"];
  run("view.freeze-row", "Figer la première ligne", () => app.setFreeze({ rows: 1, cols: 0 }), undefined, fk);
  run("view.freeze-col", "Figer la première colonne", () => app.setFreeze({ rows: 0, cols: 1 }), undefined, fk);
  run("view.freeze-cell", "Figer jusqu'à la cellule active", () => freezeAtCell(app), undefined, fk);
  run("view.unfreeze", "Libérer les volets", () => app.setFreeze({ rows: 0, cols: 0 }), undefined, ["libérer", "volets", "unfreeze"]);
  for (const f of ["SPARKLINE", "BAR", "TREND"]) {
    run(`insert.${f}`, `Insérer ${f}`, () => app.insertFunction(f), undefined, ["graphique", "cellule vivante"]);
  }

  app.hooks.command = (id) => {
    if (id === "open") void openFile(app);
    else if (id === "save") void saveFile(app);
    else if (id.startsWith("recent:")) void openRecent(app, id.slice(7));
  };
  app.hooks.context = (e) => {
    e.preventDefault();
    const t = (e.target as HTMLElement).closest<HTMLElement>(".dkg-cell");
    if (t?.dataset.key && !app.selectedKeys().includes(t.dataset.key)) app.select(t.dataset.key);
    showContextMenu(e.clientX, e.clientY, cellMenu(app));
  };

  const map = shortcuts(app);
  if (onKey) document.removeEventListener("keydown", onKey); // remount: avoid stacked listeners
  onKey = (e: KeyboardEvent) => {
    if (e.altKey && e.key === "=" && !e.ctrlKey && !e.metaKey && !inTextField(e.target)) {
      e.preventDefault(); autosum(app); return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key === "=" && e.shiftKey ? "+" : e.key.toLowerCase();
    const fn = map[k];
    if (!fn) return;
    // Let text fields (cell editor, formula bar...) keep their native undo/redo/bold/underline while editing; Ctrl+J (tools) and Ctrl+Maj+= / Ctrl+- (rows) are ignored there too.
    if (inTextField(e.target) && "zybiuj+-".includes(k)) return;
    e.preventDefault();
    fn(e);
  };
  document.addEventListener("keydown", onKey);
}

