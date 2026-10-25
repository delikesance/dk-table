/** Export of the open dk doc: Markdown / HTML written through the save dialog, PDF through the print dialog. */
import { exportDocFile } from "../io/docFiles";
import { showToast } from "./toast/toast";
import { bookOf } from "./appDocs";
import type { JNode } from "../doc/exportShared";
import type { Ctx } from "./appState";

/** Export the open document as `kind`; no-op when no document is open. Failures surface as a toast. */
export async function exportDoc(c: Ctx, kind: "md" | "html" | "pdf"): Promise<void> {
  const d = c.curDoc ? c.docs.get(c.curDoc) : undefined;
  if (!d) return;
  try {
    const book = bookOf(c), content = d.content as { content?: JNode[] };
    if (kind === "md") {
      const { toMarkdown } = await import("../doc/exportMd");
      await exportDocFile("md", toMarkdown(content, book));
    } else {
      const { toHtml } = await import("../doc/exportHtml");
      const html = toHtml(d.name, content, book);
      if (kind === "html") await exportDocFile("html", html);
      else (await import("./docPrint")).printHtml(html);
    }
  } catch (e) { showToast({ message: `Erreur : ${e instanceof Error ? e.message : String(e)}` }); }
}
