import { describe, it, expect } from "vitest";
import { createSheet, setCell, getValue } from "./sheet";

describe("literal parsing", () => {
  it("keeps hex/binary/octal text as text", () => {
    const s = createSheet();
    for (const t of ["0x10", "0b11", "0o7"]) {
      setCell(s, "C1", t);
      expect(getValue(s, "C1")).toBe(t);
    }
    setCell(s, "C1", "0x10");
    setCell(s, "D1", "=C1+1");
    expect(getValue(s, "D1")).not.toBe(17);
  });
  it("still parses decimals, signs and exponents", () => {
    const s = createSheet();
    for (const [t, n] of [["12", 12], ["-1.5", -1.5], ["+3", 3], [".5", 0.5], ["1e3", 1000], [" 7 ", 7]] as const) {
      setCell(s, "A1", t);
      expect(getValue(s, "A1")).toBe(n);
    }
  });
  it("leading apostrophe forces text", () => {
    const s = createSheet();
    setCell(s, "A1", "'=1+1");
    expect(getValue(s, "A1")).toBe("=1+1");
  });
});

describe("addresses", () => {
  it("A01 is not A1", () => {
    const s = createSheet();
    setCell(s, "A1", "5");
    setCell(s, "B1", "=A01");
    expect(getValue(s, "B1")).toEqual({ error: "#NAME?" });
  });
});
