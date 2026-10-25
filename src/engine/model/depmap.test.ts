import { describe, it, expect } from "vitest";
import { dependencyMap } from "./depmap";
import type { DktDoc } from "../../io/types";

const sheet = (id: string, name: string, cells: Record<string, string>) => ({
  id, name, cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])),
});
const doc = (): DktDoc => ({
  version: 1,
  sheets: [
    sheet("s1", "Ventes", { A1: "10", A2: "20", A3: "=SUM(A1:A2)", B1: "=A3*2", C1: "=SPARKLINE(A1:A2)" }),
    sheet("s2", "Bilan", { A1: "=Ventes!A3+1", B1: "=Ventes!A1:A2", A2: "=bad((" }),
  ],
  docs: [{ id: "d1", name: "Note", md: "Total {{@s1!A3}} et {{=s1!A1+1}}\n```dkblock\n{\"sheet\":\"s1\",\"ref\":\"A1:A2\",\"kind\":\"bar\"}\n```" }],
});

describe("dependencyMap", () => {
  it("precedents of a formula (ranges expanded to non-empty cells)", () => {
    const m = dependencyMap(doc(), "s1", "A3");
    expect(m.precedents.map((r) => r.key)).toEqual(["A1", "A2"]);
  });
  it("dependents: same sheet, other sheet, live cell, doc", () => {
    const m = dependencyMap(doc(), "s1", "A3");
    const d = m.dependents.map((r) => `${r.kind}:${r.sheet}!${r.key}`);
    expect(d).toContain("cell:Ventes!B1");
    expect(d).toContain("cell:Bilan!A1");
    expect(d).toContain("doc:Note!");
  });
  it("live cells and doc blocks depend on ranges", () => {
    const d = dependencyMap(doc(), "s1", "A1").dependents.map((r) => `${r.kind}:${r.sheet}!${r.key}`);
    expect(d).toContain("live:Ventes!C1");
    expect(d).toContain("cell:Bilan!B1");
    expect(d).toContain("doc:Note!");
  });
  it("cross-sheet precedents and unparsable formulas are tolerated", () => {
    const m = dependencyMap(doc(), "s2", "A1");
    expect(m.precedents).toEqual([{ sheetId: "s1", sheet: "Ventes", key: "A3", kind: "cell" }]);
    expect(dependencyMap(doc(), "s2", "A2").precedents).toEqual([]);
  });
  it("constant without links", () => {
    expect(dependencyMap(doc(), "s2", "Z9")).toEqual({ precedents: [], dependents: [] });
  });
});
