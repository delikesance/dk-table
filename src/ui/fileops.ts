/** File actions (open/save/CSV) wired to the app; errors reported via alert. */
import { exportCsvFile, importCsvFile, openDocument, openPath, saveAs, saveDocument } from "../io/files";
import type { App } from "./appTypes";

/** Run an async file action, surfacing failures to the user. */
async function guard(fn: () => Promise<void>): Promise<void> {
  try { await fn(); } catch (e) { window.alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`); }
}

let confirmFn: (msg: string) => boolean = (m) => window.confirm(m);

/** Replace the confirmation dialog (tests; default window.confirm). */
export function setConfirm(fn: (msg: string) => boolean): void { confirmFn = fn; }

/** True when it is safe to replace the workbook (clean, or user agreed). */
function okToDiscard(app: App): boolean {
  return !app.dirty || confirmFn("Des modifications non enregistrées seront perdues. Continuer ?");
}

/** Warn on window close/reload while the workbook has unsaved changes. */
export function installUnloadGuard(app: App): void {
  window.addEventListener("beforeunload", (e) => {
    if (app.dirty) { e.preventDefault(); e.returnValue = ""; }
  });
}

/** Open a .dktable chosen by the user (confirms if unsaved changes). */
export const openFile = (app: App) => guard(async () => {
  const r = await openDocument();
  if (!r || !okToDiscard(app)) return;
  app.loadDoc(r.doc, r.path);
  app.addRecent(r.path);
});

/** Open a known path (recent files; confirms if unsaved changes). */
export const openRecent = (app: App, path: string) => guard(async () => {
  if (!okToDiscard(app)) return;
  app.loadDoc(await openPath(path), path);
  app.addRecent(path);
});

/** Save (asks a path the first time, or always when `as`). */
export const saveFile = (app: App, as = false) => guard(async () => {
  const p = as ? await saveAs(app.toDoc()) : await saveDocument(app.toDoc(), app.path);
  if (!p) return;
  app.path = p;
  app.addRecent(p);
  app.markSaved();
});

/** Import a CSV file as a new sheet. */
export const importCsv = (app: App) => guard(async () => {
  const r = await importCsvFile();
  if (!r) return;
  const name = r.path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "CSV";
  app.importSheet(name, r.sheet);
});

/** Export the active sheet as CSV. */
export const exportCsv = (app: App) => guard(async () => { await exportCsvFile(app.activeDoc()); });
