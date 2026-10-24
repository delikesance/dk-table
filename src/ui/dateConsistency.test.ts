import { describe, expect, it } from "vitest";
import { createSheet, getValue, setCell } from "../engine/sheet";
import { serialToISO } from "../engine/fn-date";
import { formatValue } from "./numfmt";

/** DATE() (engine) and the "date" format (numfmt) share one serial convention. */
function serialOf(y: number, m: number, d: number): string {
  const s = createSheet();
  setCell(s, "A1", `=DATE(${y},${m},${d})`);
  return String(getValue(s, "A1"));
}

describe("DATE -> date format", () => {
  const cases: [number, number, number, string][] = [
    [1900, 1, 1, "01/01/1900"], [1900, 2, 28, "28/02/1900"], [1900, 2, 29, "29/02/1900"],
    [1900, 3, 1, "01/03/1900"], [2026, 10, 24, "24/10/2026"], [2000, 2, 29, "29/02/2000"],
  ];
  for (const [y, m, d, want] of cases)
    it(`${y}-${m}-${d}`, () => expect(formatValue(serialOf(y, m, d), "date")).toBe(want));
  it("serialToISO agrees with the date format", () => {
    for (const n of [1, 59, 60, 61, 36526, 46319]) {
      const [y, m, d] = serialToISO(n).split("-");
      expect(formatValue(String(n), "date")).toBe(`${d}/${m}/${y}`);
    }
  });
});
