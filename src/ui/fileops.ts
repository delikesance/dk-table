/** File actions (open/save/CSV/FEC) wired to the app; errors and replacements are reported via toasts. */
import { exportCsvFile, exportFecFile, importCsvFile, openDocument, openPath, saveAs, saveDocument } from "../io/files";
import { toFec } from "../io/fec";
import { showToast } from "./toast/toast";
import type { DktDoc } from "../io/types";
import type { App } from "./appTypes";

/** Run an async file action, surfacing failures as an action-less toast. */
async function guard(fn: () => Promise<void>): Promise<void> {
  try { await fn(); } catch (e) { showToast({ message: `Erreur : ${e instanceof Error ? e.message : String(e)}` }); }
}

/** Optional blocking confirmation; default accepts (the "Annuler" toast is the safety net). */
let confirmFn: (msg: string) => boolean = () => true;

/** Replace the confirmation hook (tests); no native dialog is ever used. */
export function setConfirm(fn: (msg: string) => boolean): void { confirmFn = fn; }

/** True when the workbook may be replaced (clean, or the confirmation hook agreed). */
function okToDiscard(app: App): boolean {
  return !app.dirty || confirmFn("Des modifications non enregistrées seront perdues. Continuer ?");
}

/** Run `load` (which replaces the workbook), then toast "Classeur remplacé" with "Annuler" restoring the old one. */
function replaceWith(app: App, load: () => void): void {
  const prev: { doc: DktDoc; path: string | undefined; dirty: boolean } = { doc: app.toDoc(), path: app.path, dirty: !!app.dirty };
  load();
  showToast({
    message: "Classeur remplacé", actionLabel: "Annuler", duration: 8000,
    onAction: () => { app.loadDoc(prev.doc, prev.path); app.dirty = prev.dirty; },
  });
}

/** "Nouveau": reset to an empty one-sheet workbook (undoable via toast). */
export function newDocument(app: App): void {
  if (!okToDiscard(app)) return;
  replaceWith(app, () => app.loadDoc({ version: 1, active: "s1", sheets: [{ id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: {} }] }));
}

/** Warn on window close/reload while the workbook has unsaved changes. */
export function installUnloadGuard(app: App): void {
  window.addEventListener("beforeunload", (e) => {
    if (app.dirty) { e.preventDefault(); e.returnValue = ""; }
  });
}

/** Open a .dktable chosen by the user (undoable via toast). */
export const openFile = (app: App) => guard(async () => {
  const r = await openDocument();
  if (!r || !okToDiscard(app)) return;
  replaceWith(app, () => app.loadDoc(r.doc, r.path));
  app.addRecent(r.path);
});

/** Open a known path (recent files; undoable via toast). */
export const openRecent = (app: App, path: string) => guard(async () => {
  if (!okToDiscard(app)) return;
  const doc = await openPath(path);
  replaceWith(app, () => app.loadDoc(doc, path));
  app.addRecent(path);
});

/**
 * Write the workbook (asks a path the first time, or always when `as`); throws on failure.
 * `finish` runs after a successful write (default: mark saved); shared by Ctrl+S and autosave.
 */
export async function writeDoc(app: App, as = false, finish: () => void = () => app.markSaved()): Promise<void> {
  const p = as ? await saveAs(app.toDoc()) : await saveDocument(app.toDoc(), app.path);
  if (!p) return;
  app.path = p;
  app.addRecent(p);
  finish();
}

/** Save with error toast (Ctrl+S / "Enregistrer sous…"). */
export const saveFile = (app: App, as = false) => guard(() => writeDoc(app, as));

/** Import a CSV file as a new sheet. */
export const importCsv = (app: App) => guard(async () => {
  const r = await importCsvFile();
  if (!r) return;
  const name = r.path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "CSV";
  app.importSheet(name, r.sheet);
});

/** Export the active sheet as CSV. */
export const exportCsv = (app: App) => guard(async () => { await exportCsvFile(app.activeDoc()); });

/** Export the active sheet as FEC (see io/fec.ts); invalid data -> one toast with the first error. */
export const exportFec = (app: App) => guard(async () => {
  const r = toFec(app.activeDoc());
  if ("errors" in r) {
    const more = r.errors.length > 1 ? ` (+${r.errors.length - 1})` : "";
    showToast({ message: `FEC invalide : ${r.errors[0]}${more}`, duration: 8000 });
    return;
  }
  await exportFecFile(r.text);
});
