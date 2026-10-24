/** Tests for recalc.ts via the public sheet API: #CYCLE! (direct/transitive/diamond), dependent recalculation, forced-text apostrophe. */
import { describe, it, expect } from "vitest";
import { createSheet, setCell, getValue, getDisplay } from "./sheet";

/** Build a sheet from a key->raw map. */
function mk(init: Record<string, string> = {}) {
  const s = createSheet();
  for (const [k, v] of Object.entries(init)) setCell(s, k, v);
  return s;
}
const CYC = { error: "#CYCLE!" };

describe("cycles", () => {
  it("self reference", () => {
    expect(getValue(mk({ A1: "=A1" }), "A1")).toEqual(CYC);
    expect(getValue(mk({ A1: "=A1+1" }), "A1")).toEqual(CYC);
  });
  it("self inside own range", () => {
    expect(getValue(mk({ A1: "=SUM(A1:A3)" }), "A1")).toEqual(CYC);
  });
  it("direct two-cell cycle marks both", () => {
    const s = mk({ A1: "=B1", B1: "=A1" });
    expect(getValue(s, "A1")).toEqual(CYC);
    expect(getValue(s, "B1")).toEqual(CYC);
  });
  it("transitive cycle A->B->C->A", () => {
    const s = mk({ A1: "=B1", B1: "=C1", C1: "=A1" });
    for (const k of ["A1", "B1", "C1"]) expect(getValue(s, k), k).toEqual(CYC);
  });
  it("cells depending on a cycle show #CYCLE!, unrelated cells unaffected", () => {
    const s = mk({ A1: "=B1", B1: "=A1", C1: "=A1+1", D1: "5" });
    expect(getValue(s, "C1")).toEqual(CYC);
    expect(getValue(s, "D1")).toBe(5);
  });
  it("breaking the cycle restores values", () => {
    const s = mk({ A1: "=B1", B1: "=A1", C1: "=A1+1" });
    setCell(s, "B1", "4");
    expect(getValue(s, "A1")).toBe(4);
    expect(getValue(s, "C1")).toBe(5);
  });
  it("creating a cycle later via edit", () => {
    const s = mk({ A1: "1", B1: "=A1", C1: "=B1" });
    setCell(s, "A1", "=C1");
    for (const k of ["A1", "B1", "C1"]) expect(getValue(s, k), k).toEqual(CYC);
  });
  it("diamond (A1 -> B1,C1 -> D1) is NOT a cycle", () => {
    const s = mk({ A1: "2", B1: "=A1+1", C1: "=A1*2", D1: "=B1+C1" });
    expect(getValue(s, "D1")).toBe(7);
    setCell(s, "A1", "10");
    expect(getValue(s, "D1")).toBe(31);
  });
  it("diamond closed back to the top is a cycle", () => {
    const s = mk({ B1: "=A1+1", C1: "=A1*2", D1: "=B1+C1" });
    setCell(s, "A1", "=D1");
    for (const k of ["A1", "B1", "C1", "D1"]) expect(getValue(s, k), k).toEqual(CYC);
  });
});

describe("dependents recalculation", () => {
  it("chain updates after editing the root", () => {
    const s = mk({ A1: "1", B1: "=A1+1", C1: "=B1+1", D1: "=C1+1" });
    expect(getValue(s, "D1")).toBe(4);
    setCell(s, "A1", "10");
    expect([getValue(s, "B1"), getValue(s, "C1"), getValue(s, "D1")]).toEqual([11, 12, 13]);
  });
  it("range dependents update on any member edit", () => {
    const s = mk({ A1: "1", A2: "2", B1: "=SUM(A1:A2)" });
    setCell(s, "A2", "10");
    expect(getValue(s, "B1")).toBe(11);
  });
  it("clearing a precedent recomputes dependents as blank", () => {
    const s = mk({ A1: "5", B1: "=A1+1", C1: "=A1" });
    setCell(s, "A1", "");
    expect(getValue(s, "B1")).toBe(1);
    expect(getValue(s, "C1")).toBe("");
    expect(s.cells["A1"]).toBeUndefined();
  });
  it("forward reference: dependent defined before precedent", () => {
    const s = mk({ A1: "=B1*2" });
    expect(getValue(s, "A1")).toBe(0);
    setCell(s, "B1", "21");
    expect(getValue(s, "A1")).toBe(42);
  });
  it("replacing a formula rewires old precedents away", () => {
    const s = mk({ A1: "1", B1: "2", C1: "=A1" });
    setCell(s, "C1", "=B1");
    setCell(s, "A1", "99");
    expect(getValue(s, "C1")).toBe(2);
    setCell(s, "C1", "7");
    setCell(s, "B1", "50");
    expect(getValue(s, "C1")).toBe(7);
  });
  it("errors propagate and recover", () => {
    const s = mk({ A1: "0", B1: "=1/A1", C1: "=B1+1" });
    expect(getDisplay(s, "C1")).toBe("#DIV/0!");
    setCell(s, "A1", "2");
    expect(getValue(s, "C1")).toBe(1.5);
  });
  it("out-of-bounds ref is #REF!, in a dependent too", () => {
    const s = mk({ A1: "=AA1", B1: "=A1+1" });
    expect(getDisplay(s, "A1")).toBe("#REF!");
    expect(getDisplay(s, "B1")).toBe("#REF!");
  });
  it("lower-case keys and refs are normalised", () => {
    const s = mk({ a1: "3", b1: "=a1*2" });
    expect(getValue(s, "B1")).toBe(6);
  });
});

describe("apostrophe forces text", () => {
  it("leading ' keeps numbers and formulas as text, apostrophe dropped", () => {
    const s = mk({ A1: "'123", A2: "'=1+1", A3: "'" });
    expect(getValue(s, "A1")).toBe("123");
    expect(getValue(s, "A2")).toBe("=1+1");
    expect(getValue(s, "A3")).toBe("");
  });
  it("raw keeps the apostrophe; text is not summed as scalar number", () => {
    const s = mk({ A1: "'5", B1: "=SUM(A1)", C1: "=SUM(A1:A1)", D1: "=A1+1" });
    expect(s.cells["A1"].raw).toBe("'5");
    expect(getValue(s, "B1")).toBe(5);
    expect(getValue(s, "C1")).toBe(0);
    expect(getValue(s, "D1")).toBe(6);
  });
  it("hex/bin text stays text; decimal text becomes number", () => {
    const s = mk({ A1: "0x10", A2: " 12 ", A3: "1e2" });
    expect(getValue(s, "A1")).toBe("0x10");
    expect(getValue(s, "A2")).toBe(12);
    expect(getValue(s, "A3")).toBe(100);
  });
});
