import { describe, it, expect } from "vitest";
import { importTextFirst, riskOf } from "./csvText";

const CSV = "id,gene,iban,qte\n007,SEPT2,FR7630006000011234567890189,12\n0123,MARCH1,FR7630006000011234567890189,3\n";

describe("riskOf", () => {
  it.each([
    ["007", true], ["SEPT2", true], ["Dec-1", true], ["1E5", true], ["1/2", true], ["1234567890123456789", true],
    ["FR7630006000011234567890189", true], ["12", false], ["0", false], ["0.5", false], ["abc", false], ["", false],
  ])("%s -> %s", (v, risky) => expect(riskOf(v) !== null).toBe(risky));
});

describe("importTextFirst", () => {
  it("forces text on risky cells and keeps numbers", () => {
    const r = importTextFirst(CSV);
    expect(r.sheet.cells.A2.raw).toBe("'007");
    expect(r.sheet.cells.B2.raw).toBe("'SEPT2");
    expect(r.sheet.cells.D2.raw).toBe("12");
  });
  it("reports avoided conversions by column", () => {
    const cols = importTextFirst(CSV).columns;
    expect(cols.map((c) => c.col)).toEqual(["A", "B", "C"]);
    expect(cols[0]).toMatchObject({ header: "id", count: 2, examples: ["007", "0123"] });
    expect(cols[0].reasons[0]).toMatch(/zéros/);
  });
  it("a refused column is imported as written", () => {
    const r = importTextFirst(CSV, { refuse: ["A"] });
    expect(r.sheet.cells.A2.raw).toBe("007");
    expect(r.sheet.cells.B2.raw).toBe("'SEPT2");
    expect(r.columns.find((c) => c.col === "A")?.refused).toBe(true);
  });
  it("clean file -> empty report; formulas stay neutralised", () => {
    const r = importTextFirst("a,b\n1,=1+1\n");
    expect(r.columns).toEqual([]);
    expect(r.sheet.cells.B2.raw).toBe("'=1+1");
  });
});
