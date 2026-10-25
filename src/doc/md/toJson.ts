/** Markdown text (stored form, sheet ids) -> JSON tree of a document, the shape read by the exports. */
import type { SyntaxNode } from "@lezer/common";
import { mdParser } from "./chipParser";
import { BLOCK_LANG, parseBlock, parseCalc, parseRef, splitChip } from "./chip";
import type { JNode } from "../exportShared";

type Marks = NonNullable<JNode["marks"]>;
/** Source text and the state of `<u>` … `</u>` (shared by the nested inline elements). */
interface X { src: string; u: boolean }

const txt = (s: string, marks: Marks): JNode => ({ type: "text", text: s, ...(marks.length ? { marks } : {}) });
const sliceOf = (x: X, n: SyntaxNode): string => x.src.slice(n.from, n.to);

/** Join neighbouring text nodes that carry the same marks. */
function merge(nodes: JNode[]): JNode[] {
  const out: JNode[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (last?.type === "text" && n.type === "text" && JSON.stringify(last.marks) === JSON.stringify(n.marks)) last.text = (last.text ?? "") + (n.text ?? "");
    else out.push(n);
  }
  return out;
}

/** Plain text between two positions: a newline is a line break. */
function gap(x: X, a: number, b: number, marks: Marks, out: JNode[]): void {
  if (b <= a) return;
  x.src.slice(a, b).split("\n").forEach((p, i) => {
    if (i) out.push({ type: "hard_break" });
    const s = i ? p.replace(/^\s+/, "") : p;
    if (s) out.push(txt(s, marks));
  });
}

/** Node of a chip text; kept as text when it is malformed. */
function chipNode(chip: string): JNode {
  const c = splitChip(chip);
  if (c?.kind === "calc") return { type: "calc", attrs: parseCalc(c.body) };
  const t = c ? parseRef(c.body) : null;
  return t ? { type: "cellRef", attrs: { ...t } } : txt(chip, []);
}

/** Inline content of `n` between `from` and `to`, with the marks already open. */
function inline(x: X, n: SyntaxNode, from: number, to: number, marks: Marks): JNode[] {
  const out: JNode[] = [];
  const cur = (): Marks => (x.u ? [...marks, { type: "underline" }] : marks);
  let pos = from;
  for (let c = n.firstChild; c; c = c.nextSibling) {
    if (c.to <= from || c.from >= to) continue;
    gap(x, pos, c.from, cur(), out);
    pos = c.to;
    const kids = (name: string): SyntaxNode[] => c.getChildren(name);
    if (c.name === "StrongEmphasis" || c.name === "Emphasis") {
      const m = kids("EmphasisMark");
      out.push(...inline(x, c, m[0].to, m[m.length - 1].from, [...cur(), { type: c.name === "Emphasis" ? "em" : "strong" }]));
    } else if (c.name === "InlineCode") {
      const m = kids("CodeMark");
      out.push(txt(x.src.slice(m[0].to, m[m.length - 1].from), [...cur(), { type: "code" }]));
    } else if (c.name === "Link" && kids("URL").length) {
      const m = kids("LinkMark"), href = sliceOf(x, kids("URL")[0]);
      out.push(...inline(x, c, m[0].to, m[1].from, [...cur(), { type: "link", attrs: { href, title: null } }]));
    } else if (c.name === "Escape") out.push(txt(x.src[c.from + 1], cur()));
    else if (c.name === "HardBreak") out.push({ type: "hard_break" });
    else if (c.name === "HTMLTag" && /^<\/?u>$/i.test(sliceOf(x, c))) x.u = !sliceOf(x, c).startsWith("</");
    else if (c.name === "Chip") out.push(chipNode(sliceOf(x, c)));
    else out.push(txt(sliceOf(x, c), cur()));
  }
  gap(x, pos, to, cur(), out);
  return merge(out);
}

const withContent = (type: string, content: JNode[], attrs?: JNode["attrs"]): JNode => ({ type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) });

/** One block node of the Markdown tree. */
function block(x: X, n: SyntaxNode): JNode {
  x.u = false;
  const h = /^(?:ATXHeading|SetextHeading)(\d)$/.exec(n.name);
  if (h) {
    const marks = n.getChildren("HeaderMark"), atx = n.name.startsWith("ATX");
    const skip = atx ? /^[ \t]*/.exec(x.src.slice(marks[0].to))![0].length : 0;
    const from = atx ? marks[0].to + skip : n.from, to = atx ? (marks.length > 1 ? marks[marks.length - 1].from : n.to) : marks[0].from;
    return withContent("heading", inline(x, n, from, Math.max(from, to), []), { level: Number(h[1]) });
  }
  switch (n.name) {
    case "Paragraph": return withContent("paragraph", inline(x, n, n.from, n.to, []));
    case "BulletList": case "OrderedList": {
      const items = n.getChildren("ListItem").map((li) => {
        const kids = blocks(x, li);
        return withContent("list_item", kids.length ? kids : [{ type: "paragraph" }]);
      });
      const first = n.firstChild?.getChild("ListMark");
      return n.name === "BulletList" ? withContent("bullet_list", items) : withContent("ordered_list", items, { order: Number.parseInt(first ? sliceOf(x, first) : "1", 10) || 1 });
    }
    case "Blockquote": return withContent("blockquote", blocks(x, n));
    case "HorizontalRule": return { type: "horizontal_rule" };
    case "FencedCode": {
      const info = n.getChild("CodeInfo"), body = n.getChild("CodeText"), lang = info ? sliceOf(x, info).trim() : "";
      const code = body ? sliceOf(x, body) : "";
      const b = lang === BLOCK_LANG ? parseBlock(code) : null;
      if (b) return { type: "liveBlock", attrs: { ...b } };
      return withContent("code_block", code ? [txt(code, [])] : [], { params: lang });
    }
    default: return withContent("paragraph", [txt(sliceOf(x, n), [])]);
  }
}

/** Block children of a container (document, list item, quote). */
function blocks(x: X, parent: SyntaxNode): JNode[] {
  const out: JNode[] = [];
  for (let c = parent.firstChild; c; c = c.nextSibling) if (!/Mark$/.test(c.name)) out.push(block(x, c));
  return out;
}

/** JSON tree `{type: "doc", content}` of the Markdown text `md`. */
export function mdToJson(md: string): JNode & { content: JNode[] } {
  const content = blocks({ src: md, u: false }, mdParser.parse(md).topNode);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
