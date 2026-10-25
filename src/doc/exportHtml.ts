/** Standalone HTML export of a dk doc (also the source of the PDF print): inline styles, no script. */
import type { BlockAttrs } from "./blocks";
import { blockRows, calcOut, refText, type CalcOut, type JNode } from "./exportShared";
import type { RefBook } from "./refs";

/** HTML-escape text. */
export const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CSS = "@page{size:A4;margin:2.5cm}body{font:12pt/1.5 'Times New Roman',Times,'Liberation Serif',serif;max-width:16cm;margin:2cm auto;padding:0 1cm;color:#000;background:#fff}" +
  "h1,h2,h3{font-weight:bold;line-height:1.25;margin:1.2em 0 .5em}h1{font-size:18pt}h2{font-size:14pt}h3{font-size:12pt;font-style:italic}p{margin:0 0 .8em;text-align:justify}" +
  "table{border-collapse:collapse;width:100%;font-size:11pt;margin:.8em 0}th{background:#eee;text-align:left}" +
  "th,td{padding:4px 8px;border:1px solid #000}blockquote{margin:1em 0 1em 1cm;padding-left:.5cm;border-left:2px solid #000}" +
  "pre.code{font:10pt/1.4 'Courier New',Courier,monospace;background:#f6f6f6;border:1px solid #000;padding:.3em .6em;margin:.8em 0;white-space:pre-wrap;page-break-inside:avoid}" +
  "pre.code .lang{display:block;text-align:right;font:italic 9pt 'Times New Roman',serif;color:#444}" +
  "@media print{body{margin:0;max-width:none;padding:0}}";

/** Inline content with marks. */
/** Export context: the workbook and the evaluator of calculation chips. */
interface Ctx { book: RefBook; co: CalcOut }

function inline(nodes: JNode[] | undefined, x: Ctx): string {
  return (nodes ?? []).map((n) => {
    if (n.type === "cellRef") return `<span class="ref">${esc(refText(x.book, n))}</span>`;
    if (n.type === "calc") return `<span class="calc">${x.co.html(n)}</span>`;
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
function table(x: Ctx, a: BlockAttrs): string {
  const r = blockRows(x.book, a);
  if (!r) return '<p class="err">#REF! (cible supprimée)</p>';
  const head = r.head ? `<thead><tr>${r.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` : "";
  const body = r.body.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

/** One block as HTML. */
function block(n: JNode, x: Ctx): string {
  const kids = (): string => (n.content ?? []).map((c) => block(c, x)).join("");
  switch (n.type) {
    case "heading": { const l = Math.min(3, Number(n.attrs?.level) || 1); return `<h${l}>${inline(n.content, x)}</h${l}>`; }
    case "paragraph": return `<p>${inline(n.content, x)}</p>`;
    case "blockquote": return `<blockquote>${kids()}</blockquote>`;
    case "horizontal_rule": return "<hr>";
    case "code_block": {
      const lang = String(n.attrs?.params ?? "").trim();
      return `<pre class="code"${lang ? ` data-lang="${esc(lang)}"` : ""}>${lang ? `<span class="lang">${esc(lang)}</span>` : ""}${esc((n.content ?? []).map((c) => c.text).join(""))}</pre>`;
    }
    case "bullet_list": return `<ul>${kids()}</ul>`;
    case "ordered_list": return `<ol>${kids()}</ol>`;
    case "list_item": return `<li>${kids()}</li>`;
    case "liveBlock": return table(x, n.attrs as unknown as BlockAttrs);
    default: return inline(n.content, x);
  }
}

/** Complete HTML page of the document `name`. */
export function toHtml(name: string, doc: { content?: JNode[] }, book: RefBook): string {
  const x: Ctx = { book, co: calcOut(book) };
  const body = (doc.content ?? []).map((n) => block(n, x)).join("\n");
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${CSS}</style></head><body>\n${body}\n</body></html>\n`;
}
