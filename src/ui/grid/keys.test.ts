import { describe, it, expect } from "vitest";
import { colName, keyOf, parseKey, rangeKeys } from "./keys";

describe("keys", () => {
  it("colName", () => {
    expect(colName(0)).toBe("A");
    expect(colName(25)).toBe("Z");
    expect(colName(26)).toBe("AA");
  });
  it("keyOf/parseKey round-trip (0-based col,row)", () => {
    expect(keyOf(0, 0)).toBe("A1");
    expect(parseKey("C10")).toEqual({ col: 2, row: 9 });
  });
  it("rangeKeys row-major, order-independent", () => {
    expect(rangeKeys({ col: 1, row: 1 }, { col: 0, row: 0 })).toEqual(["A1", "B1", "A2", "B2"]);
  });
});
