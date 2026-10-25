/** Tests for calc-mode.ts: défauts, normalisation des réglages et notification des abonnés. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CALC, calcMode, onCalcModeChange, setCalcMode } from "./calc-mode";

afterEach(() => setCalcMode(DEFAULT_CALC));

describe("calc mode", () => {
  it("defaults: automatic, not iterative, 100 iterations, max change 0.001", () => {
    expect(calcMode()).toEqual({ manual: false, iterative: false, maxIter: 100, maxChange: 0.001 });
  });

  it("notifies subscribers only when the mode changes", () => {
    const f = vi.fn();
    const off = onCalcModeChange(f);
    setCalcMode({ manual: true });
    setCalcMode({ manual: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toMatchObject({ manual: true });
    off();
    setCalcMode({ manual: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("normalizes iteration count (integer >= 1) and max change (> 0)", () => {
    setCalcMode({ maxIter: 0, maxChange: -1 });
    expect(calcMode()).toMatchObject({ maxIter: 1, maxChange: DEFAULT_CALC.maxChange });
    setCalcMode({ maxIter: 7.9 });
    expect(calcMode().maxIter).toBe(7);
  });
});
