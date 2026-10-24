/** Standalone HTML export of a dk doc (also the source of the PDF print): inline styles, no script. */
import type { BlockAttrs } from "./blocks";
import { blockRows, refText, type JNode } from "./exportShared";
import type { RefBook } from "./refs";

/** HTML-escape text. */
export const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CSS = "body{font:16px/1.6 'Inter Tight',system-ui,sans-serif;max-width:780px;margin:32px auto;padding:0 24px;color:#0a0a5c}" +
  "h1,h2,h3{font-family:'Sofia Sans Extra Condensed',sans-serif;text-transform:uppercase;letter-spacing:.04em}h2{color:#0000f2}" +
  "table{border-collapse:collapse;width:100%;font:13.5px 'DM Mono',monospace;margin:16px 0}th{background:#e1e1ff;color:#0000f2;text-align:left}" +
  "th,td{padding:8px 12px;border-top:1px solid #c9c9e6}blockquote{border-left:2px solid #0000f2;margin:16px 0;padding-left:16px;color:#55557a}" +
  "@media print{body{margin:0;max-width:none}}";

/** Inline content with marks. */
function inline(nodes: JNode[] | undefined, book: RefBook): string {
  return (nodes ?? []).map((n) => {
    if (n.type === "cellRef") return `<span class="ref">${esc(refText(book, n))}</span>`;
    if (n.type === "hard_break") return "<br>";
    let s = esc(n.text ?? "");
    for (const m of n.marks ?? []) {
      const tag = { strong: "strong", em: "em", underline: "u" }[m.type];
      if (tag) s = `<${tag}>${s}</${tag}>`;
      else if (m.type === "link") s = `<a href="${esc(String(m.attrs?.href))}">${s}</a>`;
    }
    return s;
  }).join("");
}

/** Table of a linked block. */
function table(book: RefBook, a: BlockAttrs): string {
  const r = blockRows(book, a);
  if (!r) return '<p class="err">#REF! (cible supprimée)</p>';
  const head = r.head ? `<thead><tr>${r.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` : "";
  const body = r.body.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

/** One block as HTML. */
function block(n: JNode, book: RefBook): string {
  const kids = (): string => (n.content ?? []).map((c) => block(c, book)).join("");
  switch (n.type) {
    case "heading": { const l = Math.min(3, Number(n.attrs?.level) || 1); return `<h${l}>${inline(n.content, book)}</h${l}>`; }
    case "paragraph": return `<p>${inline(n.content, book)}</p>`;
    case "blockquote": return `<blockquote>${kids()}</blockquote>`;
    case "horizontal_rule": return "<hr>";
    case "code_block": return `<pre>${esc((n.content ?? []).map((c) => c.text).join(""))}</pre>`;
    case "bullet_list": return `<ul>${kids()}</ul>`;
    case "ordered_list": return `<ol>${kids()}</ol>`;
    case "list_item": return `<li>${kids()}</li>`;
    case "liveBlock": return table(book, n.attrs as unknown as BlockAttrs);
    default: return inline(n.content, book);
  }
}

/** Complete HTML page of the document `name`. */
export function toHtml(name: string, doc: { content?: JNode[] }, book: RefBook): string {
  const body = (doc.content ?? []).map((n) => block(n, book)).join("\n");
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${CSS}</style></head><body>\n${body}\n</body></html>\n`;
}
