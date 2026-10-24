/** Conditional formatting rules follow inserted/deleted rows and columns. */
import { describe, expect, it } from "vitest";
import { shiftRules } from "./structure";
import type { CfRule } from "./types";

const rule = (range: string, extra: Record<string, unknown> = {}): CfRule =>
  ({ id: "r", range, type: "blank", format: {}, ...extra }) as CfRule;

describe("shiftRules", () => {
  it("moves and grows ranges on insert", () => {
    expect(shiftRules([rule("A2:A5")], { axis: "row", at: 1, n: 2 })[0].range).toBe("A4:A7");
    expect(shiftRules([rule("A2:A5")], { axis: "row", at: 3, n: 1 })[0].range).toBe("A2:A6");
    expect(shiftRules([rule("A1:C1")], { axis: "col", at: 2, n: 1 })[0].range).toBe("A1:D1");
  });
  it("shrinks on delete; drops parts and rules that vanish", () => {
    expect(shiftRules([rule("A2:A5")], { axis: "row", at: 3, n: -2 })[0].range).toBe("A2:A3");
    expect(shiftRules([rule("B1:B3, D1")], { axis: "col", at: 4, n: -1 })[0].range).toBe("B1:B3");
    expect(shiftRules([rule("B1:B3")], { axis: "col", at: 2, n: -1 })).toEqual([]);
  });
  it("rewrites formulas and formula operands", () => {
    const [f] = shiftRules([rule("A2:A5", { type: "formula", formula: "=B2>$C$1" })], { axis: "row", at: 1, n: 1 });
    expect(f).toMatchObject({ range: "A3:A6", formula: "=B3>$C$2" });
    const [c] = shiftRules([rule("A2:A5", { type: "cell", op: "gt", a: "=C1", b: "3" })], { axis: "row", at: 1, n: 1 });
    expect(c).toMatchObject({ a: "=C2", b: "3" });
  });
});
