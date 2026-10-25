import { describe, expect, it } from "vitest";
// @ts-ignore node types are not installed; vitest runs in node
const { readFileSync } = (await import("node:fs")) as { readFileSync(p: string, e: string): string };
const css = readFileSync("src/doc/doc.css", "utf8");
import { toHtml } from "./exportHtml";

/** Documents are classic administrative pages: serif text, black titles, no Hermes fonts or blue. */
describe("style administratif des documents", () => {
  const html = toHtml("Note", { content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titre" }] }] }, { sheets: () => [] });
  it("l'export HTML est une page A4 sérif, sans police ni bleu Hermes", () => {
    expect(html).toMatch(/Times New Roman/);
    expect(html).toMatch(/@page\{size:A4/);
    expect(html).not.toMatch(/Sofia|Inter Tight|DM Mono|#0000f2|uppercase/i);
  });
  it("la feuille de style de l'éditeur suit la même règle", () => {
    expect(css).toMatch(/Times New Roman/);
    expect(css).not.toMatch(/--font-display|text-transform: uppercase/);
    const heads = css.split("\n").filter((l: string) => l.startsWith(".dk-h"));
    expect(heads.join("\n")).not.toMatch(/accent|display/);
  });
});

describe("blocs liés", () => {
  it("pas de grande marge au-dessus, légende sous le tableau sans couper le cadre", () => {
    const css2 = readFileSync("src/doc/blocks.css", "utf8");
    expect(css2).not.toMatch(/margin:\s*52px/);
    expect(css2.split("\n").find((l: string) => l.startsWith(".dk-block__tag"))).not.toMatch(/position:\s*absolute|italic/);
  });
});
