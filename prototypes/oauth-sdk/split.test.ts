/** Sous-cartes inserees sous la carte parente, idempotent. */
import { describe, expect, it } from "vitest";
import { addSubcards } from "./split";
import { parseResearch } from "./moodboard";

const md = "# R\n\n## Idees nouvelles\n\n- **Audit de modèle** : gros.\n- **Autre** : x.\n";

describe("addSubcards", () => {
  it("insere les parties juste sous le parent, dans le meme axe, lisibles comme cartes", () => {
    const out = addSubcards(md, "Audit de modele", ["Constantes en dur", "Formules incoherentes"])!;
    const cards = parseResearch(out);
    expect(cards.map((c) => c.title)).toEqual(["Audit de modèle", "Constantes en dur", "Formules incoherentes", "Autre"]);
    expect(new Set(cards.map((c) => c.axis))).toEqual(new Set(["new"]));
  });
  it("idempotent; parent inconnu ou parties vides: rien", () => {
    const once = addSubcards(md, "Audit de modèle", ["A b c d"])!;
    expect(addSubcards(once, "Audit de modèle", ["A b c d"])).toBeNull();
    expect(addSubcards(md, "Inconnu", ["x"])).toBeNull();
    expect(addSubcards(md, "Autre", ["  "])).toBeNull();
  });
});
