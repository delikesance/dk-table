/** dk doc in the app shell: open / close the document view, keep the workbook's documents in sync. */
import { refreshTabs } from "./appGrid";
import { setTitle, type Ctx } from "./appState";

/**
 * Show document `id` in place of the grid (replaces any open document). The editor code
 * (ProseMirror, ~70 kB gzip) is loaded on first use; the view switches at once.
 */
export async function openDocView(c: Ctx, id: string): Promise<void> {
  const d = c.docs.get(id);
  if (!d) return;
  c.docEd?.destroy();
  c.docEd = undefined;
  c.docHost.replaceChildren();
  c.curDoc = id;
  c.gridHost.hidden = true;
  c.docHost.hidden = false;
  refreshTabs(c);
  const { createDocEditor } = await import("../doc/editor");
  if (c.curDoc !== id || c.docEd) return; // closed or replaced while loading
  c.docEd = createDocEditor(c.docHost, d.content, (content) => c.docs.setContent(id, content));
  c.docEd.focus();
}

/** Leave the document view (if open) and show the grid again; no tab refresh (callers do it). */
export function leaveDoc(c: Ctx): boolean {
  if (!c.curDoc) return false;
  c.docEd?.destroy();
  c.docEd = undefined;
  c.curDoc = undefined;
  c.docHost.replaceChildren();
  c.docHost.hidden = true;
  c.gridHost.hidden = false;
  return true;
}

/** Create a document, open it, mark the workbook modified; returns its id. */
export function addDoc(c: Ctx): string {
  const d = c.docs.add();
  void openDocView(c, d.id);
  return d.id;
}

/** Delete document `id`; the grid comes back when it was open. */
export function removeDoc(c: Ctx, id: string): void {
  if (c.curDoc === id) leaveDoc(c);
  c.docs.remove(id);
  refreshTabs(c);
}

/** Rename document `id` and refresh the tabs. */
export function renameDoc(c: Ctx, id: string, name: string): void {
  c.docs.rename(id, name);
  refreshTabs(c);
}

/** Every change of the document list marks the workbook modified. */
export function watchDocs(c: Ctx): void {
  c.docs.onChange(() => setTitle(c, true));
}
