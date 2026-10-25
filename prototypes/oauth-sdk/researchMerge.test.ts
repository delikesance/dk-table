/** Doublons entre axes, idees deja connues et fusion avec la synthese existante (cache des resultats trouves). */
import { describe, expect, it } from "vitest";
import { dedupe, mergeDoc, nameOf, namesOf } from "./researchMerge";

const AX = [{ id: "nouveau", title: "Idees nouvelles" }, { id: "absent", title: "Absent de dk-table, present ailleurs" }];

describe("nameOf", () => {
  it("nom en gras, sans accents ni ponctuation, insensible a la casse", () => {
    expect(nameOf("- **Graphe de dépendances** : flèches")).toBe(nameOf("- **graphe de dependances!** : autre texte"));
  });
  it("sans gras: debut du texte", () => { expect(nameOf("- Tableau croisé dynamique, synthèse")).toBe("tableau croise dynamique synthese"); });
});

describe("dedupe", () => {
  it("meme idee dans deux axes: gardee dans le premier seulement", () => {
    const r = dedupe({ nouveau: ["- **A** : x", "- **B** : y"], absent: ["- **a** : z", "- **C** : w"] }, ["nouveau", "absent"], new Set());
    expect(r).toEqual({ nouveau: ["- **A** : x", "- **B** : y"], absent: ["- **C** : w"] });
  });
  it("doublon dans un meme axe et idees deja connues: retires", () => {
    const r = dedupe({ nouveau: ["- **A** : x", "- **A** : x2", "- **K** : connue"] }, ["nouveau"], new Set([nameOf("- **K**")]));
    expect(r.nouveau).toEqual(["- **A** : x"]);
  });
});

describe("mergeDoc / namesOf", () => {
  const OLD = "# Recherche de fonctionnalites\n\n## Idees nouvelles\n\n- **Vieille** : ancienne\n\n## Absent de dk-table, present ailleurs\n\n- **Autre** : ancienne 2\n";
  it("namesOf: noms de toutes les idees d'une synthese (vide si absente)", () => {
    expect(namesOf(OLD)).toEqual(new Set([nameOf("- **Vieille**"), nameOf("- **Autre**")]));
    expect(namesOf(null).size).toBe(0);
  });
  it("les anciennes idees restent, les nouvelles s'ajoutent par axe, sans doublon", () => {
    const md = mergeDoc(OLD, { nouveau: ["- **Neuve** : n", "- **vieille** : doublon"], absent: [] }, AX);
    expect(md).toContain("- **Vieille** : ancienne");
    expect(md).toContain("- **Neuve** : n");
    expect(md).not.toContain("doublon");
    expect(md).toContain("- **Autre** : ancienne 2");
    expect((md.match(/^## /gm) ?? [])).toHaveLength(2);
  });
  it("sans synthese existante: seulement les nouvelles", () => {
    expect(mergeDoc(null, { nouveau: ["- **N**"], absent: [] }, AX)).toContain("- **N**");
  });
});
