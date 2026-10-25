/** dk doc in the app shell: open / close the document view, keep the workbook's documents in sync. */
import { refreshTabs } from "./appGrid";
import { setTitle, type Ctx } from "./appState";
import type { RefBook, RefTarget } from "../doc/refs";
import type { DocFormat } from "../doc/commands";
import { usedRange } from "../doc/blocks";

/** The workbook as read by the documents (live view of the entries). */
export const bookOf = (c: Ctx): RefBook => ({ sheets: () => c.entries.map((e) => ({ id: e.id, name: e.name, sheet: e.sheet, styles: e.styles })) });

/** Follow a reference: show the cited cell in its sheet; Alt+← comes back to the document. */
function openCell(c: Ctx, t: RefTarget): void {
  const doc = c.curDoc;
  c.app.switchSheet(t.sheet);
  c.grid.select(t.ref.split(":")[0]);
  c.backDoc = doc;
}

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
  c.docHost.hidden = false;
  applySplit(c);
  c.rebuildMenus?.();
  refreshTabs(c);
  const { createDocEditor } = await import("../doc/editor");
  if (c.curDoc !== id || c.docEd) return; // closed or replaced while loading
  c.docEd = createDocEditor(c.docHost, d.content, (content) => c.docs.setContent(id, content), { book: bookOf(c), open: (t) => openCell(c, t), lastCopy: () => c.lastCopy });
  c.docEd.focus();
}

/** Show the grid next to the document in split view, hide it behind the document otherwise. */
function applySplit(c: Ctx): void {
  c.gridHost.hidden = !!c.curDoc && !c.split;
  c.gridHost.dispatchEvent(new Event("dk-visibility"));
  c.docHost.parentElement?.classList.toggle("dk-app__main--split", !!c.split && !!c.curDoc);
}

/** Ctrl+\: sheet on the left, document on the right; again to go back to the document alone. Without an open document, opens one in split. */
export function toggleSplit(c: Ctx): void {
  if (c.curDoc) { c.split = !c.split; applySplit(c); return; }
  const id = c.backDoc && c.docs.get(c.backDoc) ? c.backDoc : c.docs.list()[0]?.id ?? c.docs.add().id;
  c.split = true;
  void openDocView(c, id);
}

/** Leave the document view (if open) and show the grid again; no tab refresh (callers do it). */
export function leaveDoc(c: Ctx): boolean {
  if (!c.curDoc) return false;
  c.docEd?.destroy();
  c.docEd = undefined;
  c.curDoc = undefined;
  c.docHost.replaceChildren();
  c.docHost.hidden = true;
  c.split = false;
  applySplit(c);
  c.rebuildMenus?.();
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

/** Current Alt+← listener, replaced on each mount. */
let onBack: ((e: KeyboardEvent) => void) | null = null;

/** Every change of the document list marks the workbook modified; Alt+← returns to the document a reference was followed from. */
export function watchDocs(c: Ctx): void {
  c.docs.onChange(() => setTitle(c, true));
  if (onBack) document.removeEventListener("keydown", onBack);
  onBack = (e) => {
    if (!e.altKey || e.key !== "ArrowLeft" || !c.backDoc || c.curDoc) return;
    const id = c.backDoc;
    c.backDoc = undefined;
    if (c.docs.get(id)) { e.preventDefault(); void openDocView(c, id); }
  };
  document.addEventListener("keydown", onBack);
}

/** Apply a text command of the Format menu to the open document. */
export function docFormat(c: Ctx, name: DocFormat): void { c.docEd?.command(name); }

/**
 * Insert into the open document: "cell" types `@` (name search), "table" / "bar" / "trend" link a block to the
 * selected range of the active sheet (its used range when only one cell is selected).
 */
export function docInsert(c: Ctx, kind: "cell" | "table" | "bar" | "trend"): void {
  if (!c.docEd) return;
  if (kind === "cell") { c.docEd.insertText("@"); return; }
  const sel = c.app.selection();
  const ref = sel.includes(":") ? sel : usedRange(c.cur.sheet);
  c.docEd.insertBlock({ sheet: c.cur.id, ref, kind, header: true, cols: null, value: null });
}
