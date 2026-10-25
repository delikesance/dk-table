/** File actions (open/save/CSV/FEC) wired to the app; errors and replacements are reported via toasts. */
import { exportCsvFile, exportFecFile, readCsvFile, openDocument, openPath, saveAs, saveDocument } from "../io/files";
import { toFec } from "../io/fec";
import { PasswordRequiredError } from "../io/protected";
import { getPassword, setPassword } from "./protection";
import { openPasswordDialog } from "./dialogs/password";
import { openImportReport } from "./dialogs/importReport";
import { stampSave } from "./history/store";
import { showToast } from "./toast/toast";
import type { DktDoc } from "../io/types";
import type { App } from "./appTypes";

/** Run an async file action, surfacing failures as an action-less toast. */
async function guard(fn: () => Promise<unknown>): Promise<void> {
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
  const prev: { doc: DktDoc; path: string | undefined; dirty: boolean; pw: string | undefined } = { doc: app.toDoc(), path: app.path, dirty: !!app.dirty, pw: getPassword() };
  load();
  showToast({
    message: "Classeur remplacé", actionLabel: "Annuler", duration: 8000,
    onAction: () => { app.loadDoc(prev.doc, prev.path); app.dirty = prev.dirty; setPassword(prev.pw); },
  });
}

/** "Nouveau": reset to an empty one-sheet workbook (undoable via toast). */
export function newDocument(app: App): void {
  if (!okToDiscard(app)) return;
  replaceWith(app, () => {
    app.loadDoc({ version: 1, active: "s1", sheets: [{ id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: {} }] });
    setPassword(undefined);
  });
}

/** Warn on window close/reload while the workbook has unsaved changes. */
export function installUnloadGuard(app: App): void {
  window.addEventListener("beforeunload", (e) => {
    if (app.dirty) { e.preventDefault(); e.returnValue = ""; }
  });
}

/** Open a .dktable chosen by the user (undoable via toast). */
export const openFile = (app: App) => guard(async () => {
  let r: Awaited<ReturnType<typeof openDocument>>;
  try { r = await openDocument(); } catch (e) { return askIfProtected(app, e); }
  if (!r || !okToDiscard(app)) return;
  replaceWith(app, () => { app.loadDoc(r.doc, r.path); setPassword(undefined); });
  app.addRecent(r.path);
});

/** Open a known path (recent files; undoable via toast). */
export const openRecent = (app: App, path: string) => guard(async () => {
  if (!okToDiscard(app)) return;
  let doc: DktDoc;
  try { doc = await openPath(path); } catch (e) { return askIfProtected(app, e); }
  replaceWith(app, () => { app.loadDoc(doc, path); setPassword(undefined); });
  app.addRecent(path);
});

/** A protected file opens the password box (the open is retried with the password); other errors are rethrown. */
function askIfProtected(app: App, e: unknown): void {
  if (!(e instanceof PasswordRequiredError) || !e.path) throw e;
  if (okToDiscard(app)) openWithPassword(app, e.path);
}

/** Boîte « mot de passe » pour un classeur chiffré : un mauvais mot de passe reste affiché, sans rien remplacer. */
function openWithPassword(app: App, path: string): void {
  openPasswordDialog({
    id: "unlock", title: "Classeur protégé", button: "Ouvrir", confirm: false,
    onSubmit: async (pw) => {
      const doc = await openPath(path, undefined, pw);
      replaceWith(app, () => { app.loadDoc(doc, path); setPassword(pw); });
      app.addRecent(path);
    },
  });
}

/** Enregistre avec `pw` (undefined = en clair) ; si rien n'est écrit (annulation, erreur), le mot de passe précédent reste. */
async function rewriteWith(app: App, pw: string | undefined): Promise<void> {
  const prev = getPassword();
  setPassword(pw);
  try {
    if (!(await writeDoc(app))) setPassword(prev);
  } catch (e) {
    setPassword(prev);
    throw e;
  }
}

/** Fichier > Chiffrer avec mot de passe… : boîte avec confirmation, puis enregistrement chiffré. */
export function protectDoc(app: App): void {
  openPasswordDialog({
    id: "protect", title: "Chiffrer avec mot de passe", button: "Chiffrer", confirm: true,
    onSubmit: (pw) => rewriteWith(app, pw),
  });
}

/** Fichier > Retirer le mot de passe : enregistre le classeur en clair. */
export const unprotectDoc = (app: App) => guard(async () => {
  if (getPassword() === undefined) { showToast({ message: "Ce classeur n'est pas protégé" }); return; }
  await rewriteWith(app, undefined);
});

/**
 * Write the workbook (asks a path the first time, or always when `as`); throws on failure.
 * `finish` runs after a successful write (default: mark saved); shared by Ctrl+S and autosave.
 * Returns false when nothing was written (cancelled); the session password is used when set.
 */
export async function writeDoc(app: App, as = false, finish: () => void = () => app.markSaved()): Promise<boolean> {
  const doc = stampSave(app.toDoc());
  const pw = getPassword();
  const p = as ? await saveAs(doc, undefined, pw) : await saveDocument(doc, app.path, undefined, pw);
  if (!p) return false;
  app.path = p;
  app.addRecent(p);
  finish();
  return true;
}

/** Save with error toast (Ctrl+S / "Enregistrer sous…"). */
export const saveFile = (app: App, as = false) => guard(() => writeDoc(app, as));

/** Import a CSV file as a new sheet. */
export const importCsv = (app: App) => guard(async () => {
  const r = await readCsvFile();
  if (!r) return;
  const name = r.path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "CSV";
  openImportReport(app, name, r.text);
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
