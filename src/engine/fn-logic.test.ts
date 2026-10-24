import { describe, expect, it } from "vitest";
import { logicFunctions as f } from "./fn-logic";
import { err } from "./types";

describe("logicFunctions", () => {
  it("AND", () => {
    expect(f.AND([1, 1])).toBe(true);
    expect(f.AND([1, 0])).toBe(false);
    expect(f.AND([[true, 2, "x", ""]])).toBe(true); // text/blank in ranges ignored
    expect(f.AND([[true, 0]])).toBe(false);
    expect(f.AND([["x"]])).toEqual(err("#VALUE!")); // nothing logical
    expect(f.AND([err("#REF!"), 0])).toEqual(err("#REF!"));
  });
  it("OR", () => {
    expect(f.OR([0, 0])).toBe(false);
    expect(f.OR([0, 1])).toBe(true);
    expect(f.OR([[0, false, 3]])).toBe(true);
    expect(f.OR([])).toEqual(err("#VALUE!"));
  });
  it("NOT", () => {
    expect(f.NOT([true])).toBe(false);
    expect(f.NOT([0])).toBe(true);
    expect(f.NOT([[1]])).toBe(false);
    expect(f.NOT([])).toEqual(err("#VALUE!"));
    expect(f.NOT(["abc"])).toEqual(err("#VALUE!"));
  });
  it("ISNUMBER", () => {
    expect(f.ISNUMBER([3])).toBe(true);
    expect(f.ISNUMBER(["a"])).toBe(false);
    expect(f.ISNUMBER([""])).toBe(false);
    expect(f.ISNUMBER([true])).toBe(false);
    expect(f.ISNUMBER([err("#REF!")])).toBe(false);
  });
  it("ISBLANK", () => {
    expect(f.ISBLANK([""])).toBe(true);
    expect(f.ISBLANK([0])).toBe(false);
    expect(f.ISBLANK(["a"])).toBe(false);
    expect(f.ISBLANK([[""]])).toBe(true);
  });
});
