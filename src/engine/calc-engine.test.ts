/** Tests for the calc modes via the public sheet API: manual (F9 / recalcWorkbook), iterative convergence, #CYCLE! otherwise. */
import { afterEach, describe, expect, it } from "vitest";
import { createSheet, getDisplay, getValue, setCell } from "./sheet";
import { DEFAULT_CALC, setCalcMode } from "./calc-mode";
import { recalcWorkbook } from "./workbook";

afterEach(() => setCalcMode(DEFAULT_CALC));

describe("manual calc", () => {
  it("an edit does not recalc dependents until a full recalc (F9)", () => {
    const s = createSheet();
    setCell(s, "A1", "1");
    setCell(s, "B1", "=A1*2");
    expect(getDisplay(s, "B1")).toBe("2");
    setCalcMode({ manual: true });
    setCell(s, "A1", "5");
    expect(getDisplay(s, "B1")).toBe("2");
    recalcWorkbook(s, true);
    expect(getDisplay(s, "B1")).toBe("10");
  });

  it("the edited formula itself is computed at once", () => {
    const s = createSheet();
    setCalcMode({ manual: true });
    setCell(s, "A1", "3");
    setCell(s, "B1", "=A1+1");
    expect(getDisplay(s, "B1")).toBe("4");
  });

  it("Calculer la feuille recalcule the sheet's formulas in topological order", () => {
    const s = createSheet();
    setCell(s, "C1", "=B1+1");
    setCell(s, "B1", "=A1*2");
    setCell(s, "A1", "1");
    setCalcMode({ manual: true });
    setCell(s, "A1", "10");
    recalcWorkbook(s, false);
    expect(getDisplay(s, "C1")).toBe("21");
  });
});

describe("cycles", () => {
  it("without iterative mode a circular reference is #CYCLE!", () => {
    const s = createSheet();
    setCell(s, "A1", "=B1+1");
    setCell(s, "B1", "=A1");
    expect(getDisplay(s, "A1")).toBe("#CYCLE!");
    expect(getDisplay(s, "B1")).toBe("#CYCLE!");
  });

  it("iterative mode converges to the fixed point", () => {
    const s = createSheet();
    setCalcMode({ iterative: true });
    setCell(s, "A1", "=1+B1*0.5");
    setCell(s, "B1", "=A1*0.5");
    expect(Number(getValue(s, "A1"))).toBeCloseTo(4 / 3, 2);
    expect(Number(getValue(s, "B1"))).toBeCloseTo(2 / 3, 2);
  });

  it("dependents of a converging cycle get the numeric result", () => {
    const s = createSheet();
    setCalcMode({ iterative: true });
    setCell(s, "A1", "=1+B1*0.5");
    setCell(s, "B1", "=A1*0.5");
    setCell(s, "C1", "=A1*10");
    expect(Number(getValue(s, "C1"))).toBeCloseTo(40 / 3, 1);
  });

  it("iterative mode stops at the iteration limit without an error", () => {
    const s = createSheet();
    setCalcMode({ iterative: true, maxIter: 5 });
    setCell(s, "A1", "=B1+1");
    setCell(s, "B1", "=A1+1");
    const v = getValue(s, "A1");
    expect(typeof v).toBe("number");
    expect(Number(v)).toBeGreaterThan(1);
  });

  it("turning iterative off gives #CYCLE! again after a recalc", () => {
    const s = createSheet();
    setCalcMode({ iterative: true });
    setCell(s, "A1", "=1+B1*0.5");
    setCell(s, "B1", "=A1*0.5");
    setCalcMode({ iterative: false });
    recalcWorkbook(s, true);
    expect(getDisplay(s, "A1")).toBe("#CYCLE!");
  });
});
