/** Tests de unparse (src/engine/unparse.ts) : l'AST reconstitué se relit à l'identique. */
import { describe, expect, it } from "vitest";
import { parseFormula } from "./parser";
import { unparse, normText } from "./unparse";

describe("unparse", () => {
  it("rétablit les parenthèses nécessaires à la précédence", () => {
    expect(unparse(parseFormula("(A1+B1)*2"))).toBe("(A1+B1)*2");
    expect(unparse(parseFormula("A1+B1*2"))).toBe("A1+B1*2");
    expect(unparse(parseFormula("A1-(B1-C1)"))).toBe("A1-(B1-C1)");
  });

  it("relit à l'identique (aller-retour sur l'AST)", () => {
    const bodies = [
      "1+2*3^2",
      "-A1^2",
      "(A1+2)*3-B1/4",
      "IF(A1>0,\"oui\",\"non\")",
      "SUM(A1:A3)*Feuille2!B2+'Ma feuille'!C3",
      "A1%+50%",
      "IFERROR(1/0,\"erreur\")&\"x\"",
      "B:B+2:5",
      "TRUE=FALSE",
    ];
    for (const b of bodies) {
      const ast = parseFormula(b);
      expect(parseFormula(unparse(ast))).toEqual(ast);
    }
  });

  it("normText ignore espaces et casse", () => {
    expect(normText(" a1 + b1 ")).toBe(normText("A1+B1"));
  });
});
