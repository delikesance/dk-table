import { describe, expect, it } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { toHtml } from "./exportHtml";
import { toMarkdown } from "./exportMd";
import type { RefBook } from "./refs";
import type { JNode } from "./exportShared";

function book(): RefBook {
  const s = createSheet();
  [["Commercial", "CA_T1", "Atteinte"], ["Alice", "39500", "0.98"], ["Bob", "40000", "1.14"]].forEach((r, i) => r.forEach((v, j) => setCell(s, "ABC"[j] + (i + 1), v)));
  return { sheets: () => [{ id: "s1", name: "Synthese", sheet: s, styles: { C2: { format: "percent" }, C3: { format: "percent" } } }] };
}
const t = (text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): JNode => ({ type: "text", text, ...(marks ? { marks } : {}) });
const doc = (...content: JNode[]) => ({ type: "doc" as const, content });
const block = (o: object = {}): JNode => ({ type: "liveBlock", attrs: { sheet: "s1", ref: "A1:C3", kind: "table", header: true, cols: null, value: null, ...o } });

describe("export Markdown", () => {
  it("titres, gras, italique, lien, listes", () => {
    const md = toMarkdown(doc(
      { type: "heading", attrs: { level: 2 }, content: [t("Titre")] },
      { type: "paragraph", content: [t("a "), t("gras", [{ type: "strong" }]), t(" "), t("it", [{ type: "em" }]), t(" "), t("lien", [{ type: "link", attrs: { href: "https://x.fr" } }])] },
      { type: "bullet_list", content: [{ type: "list_item", content: [{ type: "paragraph", content: [t("un")] }] }, { type: "list_item", content: [{ type: "paragraph", content: [t("deux")] }] }] },
      { type: "ordered_list", attrs: { order: 1 }, content: [{ type: "list_item", content: [{ type: "paragraph", content: [t("premier")] }] }] },
    ), book());
    expect(md).toContain("## Titre");
    expect(md).toContain("a **gras** *it* [lien](https://x.fr)");
    expect(md).toContain("- un\n- deux");
    expect(md).toContain("1. premier");
  });
  it("une puce de cellule est remplacée par la valeur affichée", () => {
    const md = toMarkdown(doc({ type: "paragraph", content: [t("Bob : "), { type: "cellRef", attrs: { sheet: "s1", ref: "C3" } }] }), book());
    expect(md).toContain("Bob : 114");
  });
  it("un bloc tableau devient un tableau Markdown avec les colonnes choisies", () => {
    const md = toMarkdown(doc(block({ cols: [0, 2] })), book());
    expect(md).toContain("| Commercial | Atteinte |");
    expect(md).toContain("| --- | --- |");
    expect(md).toMatch(/\| Bob \| 114/);
    expect(md).not.toContain("CA_T1");
  });
  it("un bloc en barres devient un tableau étiquette / valeur ; une cible disparue donne #REF!", () => {
    expect(toMarkdown(doc(block({ kind: "bar" })), book())).toContain("| Commercial | Atteinte |");
    expect(toMarkdown(doc(block({ sheet: "gone" })), book())).toContain("#REF!");
  });
});

describe("export HTML", () => {
  it("document complet, texte échappé, tableau lié", () => {
    const h = toHtml("Rapport <T1>", doc({ type: "paragraph", content: [t("a < b & c")] }, ) , book());
    expect(h).toContain("<!doctype html>");
    expect(h).toContain("<title>Rapport &lt;T1&gt;</title>");
    expect(h).toContain("a &lt; b &amp; c");
    const h2 = toHtml("R", doc(block()), book());
    expect(h2).toContain("<th>Commercial</th>");
    expect(h2).toContain("<td");
  });
  it("marques en balises, puce de cellule en valeur", () => {
    const h = toHtml("R", doc({ type: "paragraph", content: [t("g", [{ type: "strong" }]), t("u", [{ type: "underline" }]), { type: "cellRef", attrs: { sheet: "s1", ref: "B2" } }] }), book());
    expect(h).toContain("<strong>g</strong><u>u</u>");
    expect(h).toContain("39500");
  });
});
