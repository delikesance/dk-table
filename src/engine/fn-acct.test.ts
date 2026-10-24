import { describe, it, expect } from "vitest";
import { createSheet, setCell, getDisplay, getValue } from "./sheet";

/** Fresh sheet with `f` in Z1. */
function ev(f: string) {
  const s = createSheet();
  setCell(s, "Z1", f);
  return s;
}
const num = (f: string) => getValue(ev(f), "Z1") as number;
const show = (f: string) => getDisplay(ev(f), "Z1");

describe("MROUND", () => {
  it("rounds to the nearest multiple", () => {
    expect(num("=MROUND(10,3)")).toBe(9);
    expect(num("=MROUND(-10,-3)")).toBe(-9);
    expect(num("=MROUND(1.3,0.2)")).toBeCloseTo(1.4, 12);
    expect(num("=MROUND(7.5,5)")).toBe(10);
    expect(num("=MROUND(5,0)")).toBe(0);
  });
  it("sign mismatch -> #NUM!", () => expect(show("=MROUND(5,-2)")).toBe("#NUM!"));
});

describe("YEARFRAC", () => {
  const P = "DATE(2012,1,1),DATE(2012,7,30)";
  it("Excel documented bases", () => {
    expect(num(`=YEARFRAC(${P})`)).toBeCloseTo(0.58055556, 8);
    expect(num(`=YEARFRAC(${P},1)`)).toBeCloseTo(0.57650273, 8);
    expect(num(`=YEARFRAC(${P},2)`)).toBeCloseTo(211 / 360, 10);
    expect(num(`=YEARFRAC(${P},3)`)).toBeCloseTo(0.57808219, 8);
    expect(num(`=YEARFRAC(${P},4)`)).toBeCloseTo(209 / 360, 10);
  });
  it("basis 0: end of February rules", () =>
    expect(num("=YEARFRAC(DATE(2011,2,28),DATE(2012,2,29))")).toBeCloseTo(1, 10));
  it("basis 1 over several years averages year lengths", () =>
    expect(num("=YEARFRAC(DATE(2011,1,1),DATE(2013,1,1),1)")).toBeCloseTo(731 / (1096 / 3), 10));
  it("basis 1 within a year spanning Feb 29", () =>
    expect(num("=YEARFRAC(DATE(2011,6,1),DATE(2012,3,1),1)")).toBeCloseTo(274 / 366, 10));
  it("order does not matter", () => expect(num(`=YEARFRAC(DATE(2012,7,30),DATE(2012,1,1),1)`)).toBeCloseTo(0.57650273, 8));
  it("bad basis -> #NUM!", () => expect(show(`=YEARFRAC(${P},5)`)).toBe("#NUM!"));
});

describe("DAYS360", () => {
  it("Excel documented examples (US method)", () => {
    expect(num("=DAYS360(DATE(2011,1,30),DATE(2011,2,1))")).toBe(1);
    expect(num("=DAYS360(DATE(2011,1,1),DATE(2011,12,31))")).toBe(360);
    expect(num("=DAYS360(DATE(2011,1,1),DATE(2011,2,1))")).toBe(30);
    expect(num("=DAYS360(DATE(2011,1,30),DATE(2011,12,31))")).toBe(330);
  });
  it("US: last day of February start counts as the 30th", () =>
    expect(num("=DAYS360(DATE(2011,2,28),DATE(2011,3,31))")).toBe(30));
  it("European method", () => {
    expect(num("=DAYS360(DATE(2011,1,1),DATE(2011,12,31),TRUE)")).toBe(359);
    expect(num("=DAYS360(DATE(2011,2,28),DATE(2011,3,31),TRUE)")).toBe(32);
  });
  it("negative when reversed", () => expect(num("=DAYS360(DATE(2011,2,1),DATE(2011,1,1))")).toBe(-30));
});
