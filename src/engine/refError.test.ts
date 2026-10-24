/** Error literals in formulas: `#REF!` (written by structural edits / ref shifts) must evaluate to the error, not a parse error. */
import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

describe("error literals", () => {
  it("=#REF! shows #REF!", () => {
    const s = createSheet();
    setCell(s, "A1", "=#REF!");
    expect(getDisplay(s, "A1")).toBe("#REF!");
  });
  it("propagates through operators", () => {
    const s = createSheet();
    setCell(s, "A1", "=#REF!+1");
    expect(getDisplay(s, "A1")).toBe("#REF!");
  });
  it("other error literals parse too", () => {
    const s = createSheet();
    setCell(s, "A1", "=IFERROR(#N/A,7)");
    expect(getDisplay(s, "A1")).toBe("7");
  });
});
