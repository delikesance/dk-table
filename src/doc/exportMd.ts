/** Markdown export of a dk doc: text blocks, marks, lists, cited values and linked blocks as pipe tables. */
import type { BlockAttrs } from "./blocks";
import { blockRows, refText, type JNode } from "./exportShared";
import type { RefBook } from "./refs";

const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Inline content of a text block. */
function inline(nodes: JNode[] | undefined, book: RefBook): string {
  return (nodes ?? []).map((n) => {
    if (n.type === "cellRef") return refText(book, n);
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
function table(book: RefBook, a: BlockAttrs): string {
  const r = blockRows(book, a);
  if (!r) return "#REF! (cible supprimée)";
  const width = r.head?.length ?? r.body[0]?.length ?? 0;
  const head = r.head ?? Array(width).fill("");
  return [head, Array(width).fill("---"), ...r.body].map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
}

/** One block as Markdown lines (`indent` = list nesting prefix). */
function block(n: JNode, book: RefBook, indent = ""): string {
  switch (n.type) {
    case "heading": return `${"#".repeat(Number(n.attrs?.level) || 1)} ${inline(n.content, book)}`;
    case "paragraph": return inline(n.content, book);
    case "blockquote": return (n.content ?? []).map((c) => block(c, book)).join("\n\n").split("\n").map((l) => `> ${l}`).join("\n");
    case "horizontal_rule": return "---";
    case "code_block": return "```\n" + (n.content ?? []).map((c) => c.text).join("") + "\n```";
    case "liveBlock": return table(book, n.attrs as unknown as BlockAttrs);
    case "bullet_list": case "ordered_list": {
      const start = Number(n.attrs?.order) || 1;
      return (n.content ?? []).map((li, i) => {
        const mark = n.type === "bullet_list" ? "- " : `${start + i}. `;
        const [first, ...rest] = (li.content ?? []).map((c) => block(c, book, indent + "  "));
        return indent + mark + (first ?? "") + rest.map((r) => "\n" + r).join("");
      }).join("\n");
    }
    default: return inline(n.content, book);
  }
}

/** Markdown text of the whole document. */
export function toMarkdown(doc: { content?: JNode[] }, book: RefBook): string {
  return (doc.content ?? []).map((n) => block(n, book)).join("\n\n") + "\n";
}
