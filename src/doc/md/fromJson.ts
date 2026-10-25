/** JSON tree of a document (legacy ProseMirror content, or an export tree) -> Markdown text in stored form. */
import { blockFence, calcChip, refChip } from "./chip";
import type { BlockAttrs } from "../blocks";
import type { JNode } from "../exportShared";

/** Escape what Markdown would read as syntax in plain text. */
const esc = (s: string): string => s.replace(/([\\`*_[\]<])/g, "\\$1").replace(/\{\{/g, "\\{{");

/** Wrapping of each mark, innermost first. */
const WRAP: [string, (s: string, m: { attrs?: Record<string, unknown> }) => string][] = [
  ["code", (s) => `\`${s}\``], ["underline", (s) => `<u>${s}</u>`], ["em", (s) => `*${s}*`], ["strong", (s) => `**${s}**`],
  ["link", (s, m) => `[${s}](${m.attrs?.href})`],
];

/** Text node with its marks; spaces at the edges stay outside the marks (`** x **` is not bold). */
function textNode(n: JNode): string {
  const raw = n.text ?? "", marks = n.marks ?? [];
  if (!marks.length) return esc(raw);
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw)!;
  if (!core) return raw;
  let s = marks.some((m) => m.type === "code") ? core : esc(core);
  for (const [type, wrap] of WRAP) { const m = marks.find((x) => x.type === type); if (m) s = wrap(s, m); }
  return lead + s + trail;
}

/** Inline content of a text block. */
function inline(nodes: JNode[] | undefined): string {
  return (nodes ?? []).map((n) => {
    if (n.type === "cellRef") return refChip({ sheet: String(n.attrs?.sheet), ref: String(n.attrs?.ref) });
    if (n.type === "calc") return calcChip(String(n.attrs?.src ?? ""), String(n.attrs?.fmt ?? "auto"));
    return n.type === "hard_break" ? "\n" : textNode(n);
  }).join("").replace(/^([#>+-]|\d+[.)])(\s|$)/, "\\$1$2");
}

/** One block as Markdown lines (`indent` = list nesting prefix). */
function block(n: JNode, indent = ""): string {
  switch (n.type) {
    case "heading": return `${"#".repeat(Number(n.attrs?.level) || 1)} ${inline(n.content)}`;
    case "blockquote": return (n.content ?? []).map((c) => block(c)).join("\n\n").split("\n").map((l) => `> ${l}`).join("\n");
    case "horizontal_rule": return "---";
    case "code_block": return "```" + (n.attrs?.params ?? "") + "\n" + (n.content ?? []).map((c) => c.text).join("") + "\n```";
    case "liveBlock": return blockFence(n.attrs as unknown as BlockAttrs);
    case "bullet_list": case "ordered_list": {
      const start = Number(n.attrs?.order) || 1;
      return (n.content ?? []).map((li, i) => {
        const [first, ...rest] = (li.content ?? []).map((c) => block(c, indent + "  "));
        return indent + (n.type === "bullet_list" ? "- " : `${start + i}. `) + (first ?? "") + rest.map((r) => "\n" + r).join("");
      }).join("\n");
    }
    default: return inline(n.content);
  }
}

/** Markdown text of the document `doc`. */
export function jsonToMd(doc: { content?: JNode[] }): string {
  const md = (doc.content ?? []).map((n) => block(n)).join("\n\n");
  return md.trim() === "" ? "" : md + "\n";
}
