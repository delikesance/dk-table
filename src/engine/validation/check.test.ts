import { describe, it, expect } from "vitest";
import { checkValue, invalidCells } from "./check";
import type { ValRule } from "./types";

const whole: ValRule = { range: "A1:A5", type: "whole", min: 1, max: 10 };

describe("checkValue", () => {
  it("empty is always valid", () => expect(checkValue(whole, "")).toBeNull());
  it("whole: accepts in range", () => expect(checkValue(whole, "5")).toBeNull());
  it("whole: rejects decimal, text, out of range", () => {
    expect(checkValue(whole, "5.5")).toMatch(/entier/);
    expect(checkValue(whole, "abc")).toMatch(/entier/);
    expect(checkValue(whole, "11")).toMatch(/10/);
    expect(checkValue(whole, "0")).toMatch(/1/);
  });
  it("decimal with min only", () => {
    const r: ValRule = { range: "A1", type: "decimal", min: 0 };
    expect(checkValue(r, "-0.1")).not.toBeNull();
    expect(checkValue(r, "2,5")).toBeNull();
  });
  it("list", () => {
    const r: ValRule = { range: "A1", type: "list", items: ["oui", "non"] };
    expect(checkValue(r, "oui")).toBeNull();
    expect(checkValue(r, "peut-être")).toMatch(/oui, non/);
  });
  it("length", () => {
    const r: ValRule = { range: "A1", type: "length", max: 3 };
    expect(checkValue(r, "abc")).toBeNull();
    expect(checkValue(r, "abcd")).not.toBeNull();
  });
  it("formulas are checked on their raw text only for list/length, skipped for numbers", () => {
    expect(checkValue(whole, "=1+1")).toBeNull();
  });
});

describe("invalidCells", () => {
  const raws: Record<string, string> = { A1: "3", A2: "99", A3: "", A4: "x", B1: "99" };
  it("lists invalid cells in range only, in grid order", () => {
    const r = invalidCells([whole], (k) => raws[k] ?? "", 26, 100);
    expect(r.map((i) => i.key)).toEqual(["A2", "A4"]);
    expect(r[0].raw).toBe("99");
    expect(r[0].message).toBeTruthy();
  });
  it("no rules -> nothing", () => expect(invalidCells([], () => "9", 26, 100)).toEqual([]));
  it("first failing rule per cell, no duplicates", () => {
    const r = invalidCells([whole, { range: "A1:A5", type: "length", max: 1 }], (k) => raws[k] ?? "", 26, 100);
    expect(r.map((i) => i.key)).toEqual(["A2", "A4"]);
  });
});
