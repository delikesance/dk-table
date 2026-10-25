import { describe, it, expect } from "vitest";
import { auditModel } from "./audit";
import type { DktDoc } from "../../io/types";

const doc = (cells: Record<string, string>, name = "S"): DktDoc => ({
  version: 1, sheets: [{ id: "s1", name, cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});
const kinds = (d: DktDoc, kind: string) => auditModel(d).filter((f) => f.kind === kind).map((f) => f.key);

describe("auditModel", () => {
  it("flags hard-coded constants in formulas, not 0/1/2/100 nor rounding digits", () => {
    const d = doc({ A1: "10", B1: "=A1*1.2", B2: "=A1*2", B3: "=ROUND(A1/3,4)", B4: "=A1+100", B5: "=A1*0.055" });
    expect(kinds(d, "constant")).toEqual(["B1", "B5"]);
  });
  it("flags a formula that differs from its column pattern", () => {
    const d = doc({ A1: "1", A2: "2", A3: "3", A4: "4", B1: "=A1*2", B2: "=A2*2", B3: "=A3*3", B4: "=A4*2", C1: "=A1+1", C2: "=A2+1", C3: "7", C4: "=A4+1" });
    expect(kinds(d, "inconsistent")).toEqual(["B3", "C3"]);
  });
  it("does not flag consistent columns", () => {
    const d = doc({ A1: "1", A2: "2", A3: "3", B1: "=A1+1", B2: "=A2+1", B3: "=A3+1" });
    expect(kinds(d, "inconsistent")).toEqual([]);
  });
  it("flags ranges that miss the row just below", () => {
    const d = doc({ A1: "1", A2: "2", A3: "3", A4: "4", B1: "=SUM(A1:A3)", B9: "=SUM(A1:A4)" });
    expect(kinds(d, "range")).toEqual(["B1"]);
  });
  it("flags volatile functions", () => {
    const d = doc({ A1: "=NOW()", A2: "=OFFSET(B1,1,0)", A3: "=SUM(B1:B2)" });
    expect(kinds(d, "volatile")).toEqual(["A1", "A2"]);
  });
  it("flags cycles, across sheets too", () => {
    const d = doc({ A1: "=B1", B1: "=A1", C1: "=C1", D1: "=A1" });
    expect(kinds(d, "cycle").sort()).toEqual(["A1", "B1", "C1"]);
    const x: DktDoc = { version: 1, sheets: [
      { id: "s1", name: "A", cols: 26, rows: 100, cells: { A1: { raw: "=B!A1" } } },
      { id: "s2", name: "B", cols: 26, rows: 100, cells: { A1: { raw: "=A!A1" } } }] };
    expect(auditModel(x).filter((f) => f.kind === "cycle").length).toBe(2);
  });
  it("clean model -> no finding", () => {
    expect(auditModel(doc({ A1: "1", B1: "=A1+1" }))).toEqual([]);
  });
});
