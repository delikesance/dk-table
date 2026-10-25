/** Tests de l'évaluation partielle (src/engine/partialEval.ts) : nœud, mapping texte -> nœud, erreurs. */
import { describe, expect, it } from "vitest";
import { createSheet, getValue, setCell } from "./sheet";
import { evalNode, evalSelection, findNode } from "./partialEval";
import { parseFormula } from "./parser";

/** Feuille de test : A1=2, A2=3, A3=4, B1=5. */
function sheet() {
  const s = createSheet();
  setCell(s, "A1", "2");
  setCell(s, "A2", "3");
  setCell(s, "A3", "4");
  setCell(s, "B1", "5");
  return s;
}

describe("evalSelection", () => {
  it("un sous-nœud donne la même valeur que dans l'évaluation complète", () => {
    const s = sheet();
    setCell(s, "C1", "=(A1+1)*B1-A2");
    expect(getValue(s, "C1")).toBe(12);
    expect(evalSelection(s, "(A1+1)*B1-A2", "(A1+1)*B1")?.value).toBe(15);
    expect(evalSelection(s, "(A1+1)*B1-A2", "A2")?.value).toBe(3);
  });

  it("résout les références dans le contexte de la feuille", () => {
    const s = sheet();
    setCell(s, "A1", "10");
    expect(evalSelection(s, "B1*2+1", "B1*2")?.value).toBe(10);
  });

  it("une plage sélectionnée est mappée au nœud plage", () => {
    const s = sheet();
    const hit = evalSelection(s, "SUM(A1:A3)*2", "A1:A3");
    expect(hit?.node).toEqual({ t: "range", a: "A1", b: "A3" });
  });

  it("propage les erreurs comme résultat intermédiaire", () => {
    const s = sheet();
    expect(evalSelection(s, "1/0+A1", "1/0")?.value).toEqual({ error: "#DIV/0!" });
    expect(evalSelection(s, "FOO+1", "FOO")?.value).toEqual({ error: "#NAME?" });
  });

  it("renvoie undefined si le texte ne correspond à aucun nœud ou si la formule est invalide", () => {
    const s = sheet();
    expect(evalSelection(s, "A1+A2", "A2+A1")).toBeUndefined();
    expect(evalSelection(s, "A1+(", "A1")).toBeUndefined();
  });
});

describe("findNode", () => {
  it("prend le nœud le plus extérieur quand le texte apparaît plusieurs fois", () => {
    const ast = parseFormula("A1+A1+A1");
    expect(findNode(ast, "A1+A1")).toEqual(parseFormula("A1+A1"));
  });

  it("ignore espaces et casse de la sélection", () => {
    expect(findNode(parseFormula("A1+B1"), " a1 + b1 ")).toEqual(parseFormula("A1+B1"));
  });
});

describe("evalNode", () => {
  it("évalue directement un nœud de l'AST", () => {
    const s = sheet();
    expect(evalNode(s, parseFormula("A2*A3"))).toBe(12);
  });
});
