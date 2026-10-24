import { describe, it, expect } from "vitest";
import { cellKind, errorHint } from "./cellkind";

describe("cellKind", () => {
  it.each(["12", "-3,5", "1 234,56", "1 234,56 €", "12 %", "3.14", "1,2E+5"])("number %s", (t) => {
    expect(cellKind(t)).toBe("num");
  });
  it.each(["abc", "A1", "12 abc", ""])("text %j", (t) => {
    expect(cellKind(t)).toBe("text");
  });
  it.each(["#CYCLE!", "#DIV/0!", "#N/A", "#VALUE!", "#REF!"])("error %s", (t) => {
    expect(cellKind(t)).toBe("err");
  });
  it("errorHint gives a French sentence", () => {
    expect(errorHint("#DIV/0!")).toMatch(/zéro/);
    expect(errorHint("#CYCLE!")).toMatch(/circulaire|cycle/i);
    expect(errorHint("#N/A")).toMatch(/disponible/);
    expect(errorHint("#VALUE!")).toMatch(/valeur/i);
    expect(errorHint("#REF!")).toMatch(/référence/i);
  });
});
