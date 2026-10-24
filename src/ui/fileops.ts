/** File actions (open/save/CSV) wired to the app; errors reported via alert. */
import { exportCsvFile, importCsvFile, openDocument, openPath, saveAs, saveDocument } from "../io/files";
import type { App } from "./appTypes";

/** Run an async file action, surfacing failures to the user. */
async function guard(fn: () => Promise<void>): Promise<void> {
  try { await fn(); } catch (e) { window.alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`); }
}

/** Open a .dktable chosen by the user. */
export const openFile = (app: App) => guard(async () => {
  const r = await openDocument();
  if (!r) return;
  app.loadDoc(r.doc, r.path);
  app.addRecent(r.path);
});

/** Open a known path (recent files). */
export const openRecent = (app: App, path: string) => guard(async () => {
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
  const name = r.path.split(/[\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "CSV";
  app.importSheet(name, r.sheet);
});

/** Export the active sheet as CSV. */
export const exportCsv = (app: App) => guard(async () => { await exportCsvFile(app.activeDoc()); });
