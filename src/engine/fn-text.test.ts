/** Tests for text functions (called directly on the builtin table). */
import { describe, expect, it } from "vitest";
import { textFunctions as t } from "./fn-text";
import type { Value } from "./types";

const call = (name: string, ...a: Value[]) => t[name](a);
const NB = " ";

describe("fn-text", () => {
  it("UPPER/LOWER", () => {
    expect(call("UPPER", "a")).toBe("A");
    expect(call("LOWER", "AbC")).toBe("abc");
  });
  it("LEFT/RIGHT/MID", () => {
    expect(call("LEFT", "abc", 2)).toBe("ab");
    expect(call("LEFT", "abc")).toBe("a");
    expect(call("RIGHT", "abc", 2)).toBe("bc");
    expect(call("RIGHT", "abc", 9)).toBe("abc");
    expect(call("MID", "abcdef", 2, 3)).toBe("bcd");
  });
  it("negative args -> #VALUE!", () => {
    expect(call("LEFT", "abc", -1)).toEqual({ error: "#VALUE!" });
    expect(call("RIGHT", "abc", -1)).toEqual({ error: "#VALUE!" });
    expect(call("MID", "abc", 0, 1)).toEqual({ error: "#VALUE!" });
    expect(call("MID", "abc", 1, -1)).toEqual({ error: "#VALUE!" });
  });
  it("LEN, number coercion, TRIM", () => {
    expect(call("LEN", "abcd")).toBe(4);
    expect(call("LEN", 12345)).toBe(5);
    expect(call("LEFT", 12345, 2)).toBe("12");
    expect(call("TRIM", "  a   b  ")).toBe("a b");
  });
  it("errors propagate", () => {
    const e = { error: "#DIV/0!" as const };
    expect(call("UPPER", e)).toEqual(e);
  });
  it("TEXT", () => {
    expect(call("TEXT", 3.7, "0")).toBe("4");
    expect(call("TEXT", 3.14159, "0.00")).toBe("3,14");
    expect(call("TEXT", 0.256, "0%")).toBe("26%");
    expect(call("TEXT", 0.256, "0.0%")).toBe("25,6%");
    expect(call("TEXT", 1234567.891, "#,##0.00")).toBe(`1${NB}234${NB}567,89`);
    expect(call("TEXT", "x", "0")).toEqual({ error: "#VALUE!" });
  });
});
