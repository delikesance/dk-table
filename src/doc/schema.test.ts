import { describe, expect, it } from "vitest";
import { Node } from "prosemirror-model";
import { docSchema, emptyDoc } from "./schema";

describe("schéma du document", () => {
  it("expose les blocs et marques du périmètre v1", () => {
    for (const n of ["paragraph", "heading", "bullet_list", "ordered_list", "list_item", "blockquote", "horizontal_rule"]) {
      expect(docSchema.nodes[n], n).toBeDefined();
    }
    for (const m of ["strong", "em", "underline", "link"]) expect(docSchema.marks[m], m).toBeDefined();
  });
  it("emptyDoc est un document valide d'un paragraphe vide", () => {
    const d = Node.fromJSON(docSchema, emptyDoc());
    d.check();
    expect(d.childCount).toBe(1);
    expect(d.firstChild!.type.name).toBe("paragraph");
  });
  it("fait l'aller-retour JSON avec marques et titres", () => {
    const json = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Commissions T1" }] },
        { type: "paragraph", content: [
          { type: "text", text: "gras", marks: [{ type: "strong" }] },
          { type: "text", text: " souligné", marks: [{ type: "underline" }] },
        ] },
      ],
    };
    const d = Node.fromJSON(docSchema, json);
    d.check();
    expect(d.toJSON()).toEqual(json);
  });
  it("emptyDoc renvoie un objet neuf à chaque appel", () => {
    expect(emptyDoc()).not.toBe(emptyDoc());
  });
});
