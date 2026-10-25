import { describe, expect, it } from "vitest";
import { blockFence, calcChip, parseBlock, parseCalc, parseRef, refChip, splitChip } from "./chip";
import { mdParser } from "./chipParser";

/** Syntax of chips and the parser that keeps formulas away from emphasis. */
describe("chip syntax", () => {
  it("round-trips references, calculations and blocks", () => {
    expect(parseRef("Feuille 1!B3")).toEqual({ sheet: "Feuille 1", ref: "B3" });
    expect(refChip({ sheet: "s1", ref: "A1:B2" })).toBe("{{@s1!A1:B2}}");
    expect(calcChip("{s1}!B3*2", "auto")).toBe("{{={s1}!B3*2}}");
    expect(parseCalc("A1+1|percent")).toEqual({ src: "A1+1", fmt: "percent" });
    expect(parseCalc("A1+1")).toEqual({ src: "A1+1", fmt: "auto" });
    expect(splitChip("{{@a!B3}}")).toEqual({ kind: "ref", body: "a!B3" });
    const a = { sheet: "s1", ref: "A1:B2", kind: "bar" as const, header: false, cols: [0, 1], value: 1 };
    const json = blockFence(a).split("\n")[1];
    expect(parseBlock(json)).toEqual(a);
    expect(parseBlock("{nope")).toBeNull();
  });
  it("parses {{…}} as one Chip even with * and _ inside", () => {
    const src = "a {{=A1*B1 + C1*D1}} b _x_";
    const names: string[] = [];
    mdParser.parse(src).iterate({ enter: (n) => { names.push(n.name); } });
    expect(names).toContain("Chip");
    expect(names.filter((n) => n === "Emphasis")).toHaveLength(1);
  });
});
