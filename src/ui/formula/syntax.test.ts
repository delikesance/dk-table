// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formulaSyntax, fromInput, shiftTyped, toInput } from "./syntax";

/** Pins the browser language for one test (navigator.language is read on each call). */
function setLang(lang: string): void {
  Object.defineProperty(navigator, "language", { value: lang, configurable: true });
}

describe("formula syntax of the UI", () => {
  beforeEach(() => setLang("fr-FR"));
  afterEach(() => { delete (navigator as { language?: string }).language; });

  it("follows navigator.language", () => {
    expect(formulaSyntax()).toEqual({ argSep: ";", decimal: "," });
    setLang("en-US");
    expect(formulaSyntax()).toEqual({ argSep: ",", decimal: "." });
  });
  it("shows the stored formula in the user syntax, and reads it back", () => {
    expect(toInput("=SUM(A1,2.5)")).toBe("=SUM(A1;2,5)");
    expect(fromInput("=SUM(A1;2,5)")).toBe("=SUM(A1,2.5)");
    expect(toInput("plain")).toBe("plain");
  });
  it("shifts a typed formula from the user syntax (Ctrl+Enter fill)", () => {
    expect(shiftTyped("=A1;2,5", 0, 1)).toBe("=A2,2.5");
  });
});
