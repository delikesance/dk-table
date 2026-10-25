import { describe, expect, it } from "vitest";
import { mdToJson } from "./toJson";
import { jsonToMd } from "./fromJson";
import type { JNode } from "../exportShared";

/** Markdown text (stored form) <-> the JSON tree read by the exports. */
const doc = (md: string): JNode[] => mdToJson(md).content ?? [];
const text = (s: string, ...marks: string[]): JNode => ({ type: "text", text: s, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });

describe("mdToJson", () => {
  it("reads titles, paragraphs and marks", () => {
    expect(doc("# Titre\n\nun **gras** et *ital*")).toEqual([
      { type: "heading", attrs: { level: 1 }, content: [text("Titre")] },
      { type: "paragraph", content: [text("un "), text("gras", "strong"), text(" et "), text("ital", "em")] },
    ]);
  });
  it("reads underline tags, code and links", () => {
    const [p] = doc("<u>so</u> `c` [l](http://x)");
    expect(p.content).toEqual([text("so", "underline"), text(" "), text("c", "code"), text(" "),
      { type: "text", text: "l", marks: [{ type: "link", attrs: { href: "http://x", title: null } }] }]);
  });
  it("reads nested lists, quotes, rules and code", () => {
    const [ul, ol, q, hr, code] = doc("- a\n  - b\n\n3. c\n\n> cite\n\n---\n\n```js\nx\n```");
    expect(ul).toMatchObject({ type: "bullet_list" });
    expect(ul.content?.[0].content?.[1]).toMatchObject({ type: "bullet_list" });
    expect(ol).toMatchObject({ type: "ordered_list", attrs: { order: 3 } });
    expect(q).toMatchObject({ type: "blockquote" });
    expect(hr.type).toBe("horizontal_rule");
    expect(code).toMatchObject({ type: "code_block", attrs: { params: "js" }, content: [{ type: "text", text: "x" }] });
  });
  it("reads chips and block fences, a formula's * is not emphasis", () => {
    const [p, b] = doc("a {{@s1!B3}} {{=A1*B1 + C1*D1|percent}}\n\n```dkblock\n{\"sheet\":\"s1\",\"ref\":\"A1:B2\",\"kind\":\"bar\",\"header\":true,\"cols\":null,\"value\":null}\n```");
    expect(p.content).toEqual([text("a "), { type: "cellRef", attrs: { sheet: "s1", ref: "B3" } }, text(" "), { type: "calc", attrs: { src: "A1*B1 + C1*D1", fmt: "percent" } }]);
    expect(b).toMatchObject({ type: "liveBlock", attrs: { sheet: "s1", ref: "A1:B2", kind: "bar" } });
  });
  it("turns a single newline into a line break and gives an empty doc one paragraph", () => {
    expect(doc("a\nb")[0].content).toEqual([text("a"), { type: "hard_break" }, text("b")]);
    expect(doc("")).toEqual([{ type: "paragraph" }]);
  });
});

describe("jsonToMd", () => {
  it("round-trips the structures of a legacy document", () => {
    const md = "# T\n\nun **gras** et *ital* <u>so</u>\n\n- a\n  - b\n\n> cite\n\n---\n\n{{@s1!B3}} {{=A1*2|percent}}";
    expect(jsonToMd(mdToJson(md))).toBe(md + "\n");
  });
  it("escapes markdown characters of plain text and keeps spaces outside the marks", () => {
    const j: JNode = { type: "doc", content: [{ type: "paragraph", content: [text("2*3 "), { type: "text", text: " gras ", marks: [{ type: "strong" }] }, text("{{x}}")] }] };
    const md = jsonToMd(j);
    expect(md).toBe("2\\*3  **gras** \\{{x}}\n");
    expect(doc(md)[0].content?.map((n) => n.text).join("")).toBe("2*3  gras {{x}}");
  });
});
