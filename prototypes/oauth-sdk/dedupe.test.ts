/** Doublons deterministes : similarite de titres, TODO.md, cartes terminees, meme lot. */
import { describe, expect, it } from "vitest";
import { doneTitles, findDuplicates, similarity } from "./dedupe";

describe("dedupe", () => {
  it("similarite insensible a la casse et aux accents", () => {
    expect(similarity("Audit de modèle intégré", "audit de modele integre")).toBe(1);
    expect(similarity("Carte des dépendances", "Profileur de recalcul")).toBe(0);
    expect(similarity("a b", "c d")).toBe(0); // aucun mot significatif
  });
  it("une carte proche d'une carte terminee ou d'une tache faite est un doublon, avec la source dans la raison", () => {
    const known = [{ title: "Audit de modèle intégré", where: "termines.jsonl" }, ...doneTitles("- [ ] ouverte\n- [x] **Profileur de recalcul formules**\n")];
    const d = findDuplicates([{ id: "a", title: "Audit du modele integre" }, { id: "b", title: "Profileur de recalcul formules" }, { id: "c", title: "Unités natives" }], known, 0.6);
    expect(d.get("a")).toContain("termines.jsonl");
    expect(d.get("b")).toContain("TODO.md");
    expect(d.has("c")).toBe(false);
  });
  it("dans un meme lot la premiere reste, la suivante est ecartee", () => {
    const d = findDuplicates([{ id: "a", title: "Historique local voyage temps" }, { id: "b", title: "Historique local, voyage dans le temps" }], []);
    expect([...d.keys()]).toEqual(["b"]);
  });
});
