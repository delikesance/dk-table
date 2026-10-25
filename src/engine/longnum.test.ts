/** Tests de la détection des identifiants longs (> 15 chiffres significatifs). */
import { describe, it, expect } from "vitest";
import { isLongNumber, LONG_HINT } from "./longnum";
import { createSheet, setCell, getValue, getDisplay } from "./sheet";
import { rawKind } from "./audit-kinds";

describe("isLongNumber", () => {
  it.each(["1234567890123456", "12345678901234567890", "-1234567890123456", "+1234567890123456", "1234567890123.4567", "0001234567890123456"])("long %s", (t) => {
    expect(isLongNumber(t)).toBe(true);
  });
  it.each(["123456789012345", "0000123456789012345", "-123456789012345", "123456789012.345", "1.5e30", "12345678901234567e2", "abc", "", "'1234567890123456", "FR7630006000011234567890189"])("not long %j", (t) => {
    expect(isLongNumber(t)).toBe(false);
  });
  it("hint is French", () => expect(LONG_HINT).toContain("Identifiant long"));
});

describe("cellule", () => {
  it("garde le texte exact", () => {
    const s = createSheet();
    setCell(s, "A1", "12345678901234567890");
    expect(getValue(s, "A1")).toBe("12345678901234567890");
    expect(getDisplay(s, "A1")).toBe("12345678901234567890");
  });
  it("<= 15 chiffres reste un nombre", () => {
    const s = createSheet();
    setCell(s, "A1", "123456789012345");
    expect(getValue(s, "A1")).toBe(123456789012345);
  });
  it("une formule lit le texte exact", () => {
    const s = createSheet();
    setCell(s, "A1", "12345678901234567890");
    setCell(s, "B1", "=A1");
    expect(getValue(s, "B1")).toBe("12345678901234567890");
  });
  it("rawKind long", () => expect(rawKind("12345678901234567890")).toBe("long"));
});
