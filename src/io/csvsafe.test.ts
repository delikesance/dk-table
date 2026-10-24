import { describe, expect, it } from "vitest";
import { fromCsv, toCsv } from "./csv";
import type { DocSheet } from "./types";

const sheet = (cells: Record<string, string>): DocSheet => ({
  id: "s", name: "S", cols: 5, rows: 5,
  cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])),
});

describe("csv safety", () => {
  it("exports computed values for formulas", () => {
    expect(toCsv(sheet({ A1: "4", B1: "=A1*2" }))).toBe("4,8");
  });
  it("uses an injected value function", () => {
    expect(toCsv(sheet({ A1: "=1" }), ",", () => "X")).toBe("X");
  });
  it("imports =1+1 as literal text", () => {
    const c = fromCsv("=1+1,a").cells;
    expect(c.A1.raw).toBe("'=1+1");
    expect(c.B1.raw).toBe("a");
  });
});
