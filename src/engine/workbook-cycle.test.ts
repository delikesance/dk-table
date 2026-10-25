/** Tests for circular references across sheets: #CYCLE! normally, converged or capped in iterative mode. */
import { afterEach, describe, expect, it } from "vitest";
import { createSheet, getDisplay, getValue, setCell, bindWorkbook } from "./sheet";
import { DEFAULT_CALC, setCalcMode } from "./calc-mode";

afterEach(() => setCalcMode(DEFAULT_CALC));

/** Two sheets bound as Feuille1 / Feuille2 (A1 of each reads the other). */
function pair() {
  const a = createSheet();
  const b = createSheet();
  bindWorkbook(() => [{ name: "Feuille1", sheet: a }, { name: "Feuille2", sheet: b }]);
  return { a, b };
}

describe("cross-sheet cycles", () => {
  it("without iterative mode a cross-sheet circular reference is #CYCLE!", () => {
    const { a, b } = pair();
    setCell(a, "A1", "=Feuille2!A1+1");
    setCell(b, "A1", "=Feuille1!A1*0.5");
    expect(getDisplay(a, "A1")).toBe("#CYCLE!");
    expect(getDisplay(b, "A1")).toBe("#CYCLE!");
  });

  it("iterative mode converges across sheets to the fixed point", () => {
    setCalcMode({ iterative: true });
    const { a, b } = pair();
    setCell(a, "A1", "=Feuille2!A1*0.5+1");
    setCell(b, "A1", "=Feuille1!A1*0.5");
    expect(Number(getValue(a, "A1"))).toBeCloseTo(4 / 3, 2);
    expect(Number(getValue(b, "A1"))).toBeCloseTo(2 / 3, 2);
  });

  it("iterative mode stops at the iteration limit across sheets without an error", () => {
    setCalcMode({ iterative: true, maxIter: 5 });
    const { a, b } = pair();
    setCell(a, "A1", "=Feuille2!A1+1");
    setCell(b, "A1", "=Feuille1!A1+1");
    const v = getValue(a, "A1");
    expect(typeof v).toBe("number");
    expect(Number(v)).toBeGreaterThan(1);
  });
});
