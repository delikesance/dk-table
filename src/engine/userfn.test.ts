/** Tests des fonctions nommées : définition (nom, paramètres, corps), appel, erreurs, recalcul. */
import { afterEach, describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";
import { checkUserFn, recalcAll, setUserFunctions } from "./userfn";

afterEach(() => setUserFunctions([]));

describe("fonctions nommées", () => {
  it("appel simple avec paramètres", () => {
    setUserFunctions([{ name: "TVA", params: ["ht", "taux"], body: "=ht*(1+taux)" }]);
    const s = createSheet();
    setCell(s, "A1", "=TVA(100;0.2)");
    expect(getDisplay(s, "A1")).toBe("120");
  });
  it("arguments cellules et plages, casse libre", () => {
    setUserFunctions([{ name: "Total", params: ["r"], body: "SUM(r)*2" }]);
    const s = createSheet();
    setCell(s, "A1", "1"); setCell(s, "A2", "2");
    setCell(s, "B1", "=total(A1:A2)");
    expect(getDisplay(s, "B1")).toBe("6");
    setCell(s, "A1", "10");
    expect(getDisplay(s, "B1")).toBe("24");
  });
  it("une fonction nommée en appelle une autre", () => {
    setUserFunctions([
      { name: "DOUBLE", params: ["x"], body: "=x*2" },
      { name: "QUAD", params: ["x"], body: "=DOUBLE(DOUBLE(x))" },
    ]);
    const s = createSheet();
    setCell(s, "A1", "=QUAD(3)");
    expect(getDisplay(s, "A1")).toBe("12");
  });
  it("mauvais nombre d'arguments -> #VALUE!, inconnue -> #NAME?", () => {
    setUserFunctions([{ name: "F", params: ["x"], body: "=x" }]);
    const s = createSheet();
    setCell(s, "A1", "=F(1;2)");
    setCell(s, "A2", "=G(1)");
    expect(getDisplay(s, "A1")).toBe("#VALUE!");
    expect(getDisplay(s, "A2")).toBe("#NAME?");
  });
  it("récursion infinie -> erreur, pas de plantage", () => {
    setUserFunctions([{ name: "R", params: ["x"], body: "=R(x)" }]);
    const s = createSheet();
    setCell(s, "A1", "=R(1)");
    expect(getDisplay(s, "A1")).toBe("#VALUE!");
  });
  it("recalcAll applique une définition ajoutée après coup", () => {
    const s = createSheet();
    setCell(s, "A1", "=F(2)");
    expect(getDisplay(s, "A1")).toBe("#NAME?");
    setUserFunctions([{ name: "F", params: ["x"], body: "=x+1" }]);
    recalcAll(s);
    expect(getDisplay(s, "A1")).toBe("3");
  });
  it("les fonctions intégrées priment", () => {
    setUserFunctions([{ name: "SUM", params: ["x"], body: "=0" }]);
    const s = createSheet();
    setCell(s, "A1", "=SUM(1;2)");
    expect(getDisplay(s, "A1")).toBe("3");
  });
  it("checkUserFn valide nom, paramètres et corps", () => {
    expect(checkUserFn({ name: "OK", params: ["a", "b"], body: "=a+b" })).toBeNull();
    expect(checkUserFn({ name: "1x", params: [], body: "=1" })).toMatch(/nom/i);
    expect(checkUserFn({ name: "SUM", params: [], body: "=1" })).toMatch(/existe/i);
    expect(checkUserFn({ name: "F", params: ["a", "a"], body: "=a" })).toMatch(/param/i);
    expect(checkUserFn({ name: "F", params: ["a1"], body: "=a1" })).toMatch(/param/i);
    expect(checkUserFn({ name: "F", params: [], body: "" })).toMatch(/corps/i);
  });
});
