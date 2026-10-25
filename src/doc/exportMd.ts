/** Markdown export of a dk doc: text blocks, marks, lists, cited values and linked blocks as pipe tables. */
import type { BlockAttrs } from "./blocks";
import { blockRows, calcOut, refText, type CalcOut, type JNode } from "./exportShared";
import type { RefBook } from "./refs";

/** Export context: the workbook and the evaluator of calculation chips. */
interface Ctx { book: RefBook; co: CalcOut }

const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Inline content of a text block. */
function inline(nodes: JNode[] | undefined, x: Ctx): string {
  return (nodes ?? []).map((n) => {
    if (n.type === "cellRef") return refText(x.book, n);
    if (n.type === "calc") return x.co.text(n);
    if (n.type === "hard_break") return "  \n";
    let s = n.text ?? "";
    for (const m of n.marks ?? []) {
      if (m.type === "strong") s = `**${s}**`;
      else if (m.type === "em") s = `*${s}*`;
      else if (m.type === "underline") s = `<u>${s}</u>`;
      else if (m.type === "link") s = `[${s}](${m.attrs?.href})`;
    }
    return s;
  }).join("");
}

/** Pipe table of a linked block. */
function table(x: Ctx, a: BlockAttrs): string {
  const r = blockRows(x.book, a);
  if (!r) return "#REF! (cible supprimée)";
  const width = r.head?.length ?? r.body[0]?.length ?? 0;
  const head = r.head ?? Array(width).fill("");
  return [head, Array(width).fill("---"), ...r.body].map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
}

/** One block as Markdown lines (`indent` = list nesting prefix). */
function block(n: JNode, x: Ctx, indent = ""): string {
  switch (n.type) {
    case "heading": return `${"#".repeat(Number(n.attrs?.level) || 1)} ${inline(n.content, x)}`;
    case "paragraph": return inline(n.content, x);
    case "blockquote": return (n.content ?? []).map((c) => block(c, x)).join("\n\n").split("\n").map((l) => `> ${l}`).join("\n");
    case "horizontal_rule": return "---";
    case "code_block": return "```\n" + (n.content ?? []).map((c) => c.text).join("") + "\n```";
    case "liveBlock": return table(x, n.attrs as unknown as BlockAttrs);
    case "bullet_list": case "ordered_list": {
      const start = Number(n.attrs?.order) || 1;
      return (n.content ?? []).map((li, i) => {
        const mark = n.type === "bullet_list" ? "- " : `${start + i}. `;
        const [first, ...rest] = (li.content ?? []).map((c) => block(c, x, indent + "  "));
        return indent + mark + (first ?? "") + rest.map((r) => "\n" + r).join("");
      }).join("\n");
    }
    default: return inline(n.content, x);
  }
}

/** Markdown text of the whole document. */
export function toMarkdown(doc: { content?: JNode[] }, book: RefBook): string {
  const x: Ctx = { book, co: calcOut(book) };
  return (doc.content ?? []).map((n) => block(n, x)).join("\n\n") + "\n";
}
