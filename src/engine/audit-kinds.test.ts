import { describe, expect, it } from "vitest";
import { rawKind } from "./audit-kinds";

describe("rawKind", () => {
  it("formule", () => { expect(rawKind("=A1+1")).toBe("formula"); expect(rawKind(" =SUM(A1:A3)")).toBe("formula"); });
  it("constante numérique", () => {
    for (const r of ["5", "-3,5", "1 200", "2.5e3", "12%", "+7"]) expect(rawKind(r)).toBe("number");
  });
  it("texte", () => { expect(rawKind("abc")).toBe("text"); expect(rawKind("'=A1")).toBe("text"); expect(rawKind("'5")).toBe("text"); });
  it("vide", () => { expect(rawKind("")).toBe("empty"); expect(rawKind("  ")).toBe("empty"); });
});
