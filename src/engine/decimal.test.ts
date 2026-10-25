import { describe, expect, it } from "vitest";
import { createSheet, setCell, getValue } from "./sheet";
import { recalcAll } from "./userfn";
import { setDecimalMode, onDecimalChange, decimalMode, fix, displayGap } from "./decimal";

describe("décimal exact", () => {
  it("désactivé : IEEE 754", () => {
    setDecimalMode(false);
    const s = createSheet();
    setCell(s, "A1", "=0.1+0.2");
    expect(getValue(s, "A1")).not.toBe(0.3);
  });
  it("activé : 0,1+0,2 = 0,3 et recalcul au basculement", () => {
    const s = createSheet();
    setDecimalMode(false);
    setCell(s, "A1", "=0.1+0.2");
    const off = getValue(s, "A1");
    expect(off).not.toBe(0.3);
    const un = onDecimalChange(() => recalcAll(s)); // le branchement de l'app
    setDecimalMode(true);
    expect(decimalMode()).toBe(true);
    expect(getValue(s, "A1")).toBe(0.3);
    setDecimalMode(false);
    expect(getValue(s, "A1")).toBe(off);
    setDecimalMode(true);
    un();
    setCell(s, "A2", "=0.1+0.2");
    expect(getValue(s, "A2")).toBe(0.3);
    setCell(s, "A3", "=1.1*3");
    expect(getValue(s, "A3")).toBe(3.3);
    setDecimalMode(false);
  });
  it("fix", () => {
    setDecimalMode(true);
    expect(fix(0.30000000000000004)).toBe(0.3);
    setDecimalMode(false);
    expect(fix(0.30000000000000004)).toBe(0.30000000000000004);
  });
  it("displayGap", () => {
    expect(displayGap(1.005, "number")).toBe(true);
    expect(displayGap(1.5, "currency")).toBe(false);
    expect(displayGap(0.12345, "percent")).toBe(true);
    expect(displayGap(0.1234, "percent")).toBe(false);
    expect(displayGap(1.005, undefined)).toBe(false);
  });
});
