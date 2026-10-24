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

describe("SLN / SYD", () => {
  it("SLN Excel example", () => expect(num("=SLN(30000,7500,10)")).toBe(2250));
  it("SLN life 0 -> #DIV/0!", () => expect(show("=SLN(1,0,0)")).toBe("#DIV/0!"));
  it("SYD Excel examples", () => {
    expect(num("=SYD(30000,7500,10,1)")).toBeCloseTo(4090.91, 2);
    expect(num("=SYD(30000,7500,10,10)")).toBeCloseTo(409.09, 2);
  });
  it("SYD period out of range -> #NUM!", () => expect(show("=SYD(30000,7500,10,11)")).toBe("#NUM!"));
});

describe("DB", () => {
  it("first partial year (month 7)", () => expect(num("=DB(1000000,100000,6,1,7)")).toBeCloseTo(186083.33, 2));
  it("Excel example years 2 and 7", () => {
    expect(num("=DB(1000000,100000,6,2,7)")).toBeCloseTo(259639.42, 2);
    expect(num("=DB(1000000,100000,6,7,7)")).toBeCloseTo(15845.1, 1);
  });
  it("default month 12 (rate rounded to 3 decimals)", () => expect(num("=DB(1000,100,5,1)")).toBeCloseTo(369, 6));
  it("period beyond life -> #NUM!", () => expect(show("=DB(1000,100,5,6)")).toBe("#NUM!"));
});

describe("DDB", () => {
  it("Excel examples", () => {
    expect(num("=DDB(2400,300,10*365,1)")).toBeCloseTo(1.32, 2);
    expect(num("=DDB(2400,300,10*12,1,2)")).toBeCloseTo(40, 6);
    expect(num("=DDB(2400,300,10,1)")).toBeCloseTo(480, 6);
    expect(num("=DDB(2400,300,10,2,1.5)")).toBeCloseTo(306, 6);
    expect(num("=DDB(2400,300,10,10)")).toBeCloseTo(22.12, 2);
  });
  it("period 0 -> #NUM!", () => expect(show("=DDB(2400,300,10,0)")).toBe("#NUM!"));
});

describe("VDB", () => {
  it("Excel examples", () => {
    expect(num("=VDB(2400,300,10*365,0,1)")).toBeCloseTo(1.32, 2);
    expect(num("=VDB(2400,300,10*12,0,1)")).toBeCloseTo(40, 6);
    expect(num("=VDB(2400,300,10,0,1)")).toBeCloseTo(480, 6);
    expect(num("=VDB(2400,300,10*12,6,18)")).toBeCloseTo(396.31, 2);
    expect(num("=VDB(2400,300,10*12,6,18,1.5)")).toBeCloseTo(311.81, 2);
    expect(num("=VDB(2400,300,10,0,0.875,1.5)")).toBeCloseTo(315, 6);
  });
  it("switches to straight line unless no_switch", () => {
    expect(num("=VDB(2400,300,10,0,10,1.5)")).toBeCloseTo(2100, 6);
    expect(num("=VDB(2400,300,10,0,10,1.5,TRUE)")).toBeLessThan(2000);
  });
  it("end before start -> #NUM!", () => expect(show("=VDB(2400,300,10,3,2)")).toBe("#NUM!"));
});

describe("AMORDEGRC / AMORLINC", () => {
  it("Excel examples", () => {
    expect(num("=AMORDEGRC(2400,39679,39813,300,1,0.15,1)")).toBe(776);
    expect(num("=AMORLINC(2400,39679,39813,300,1,0.15,1)")).toBeCloseTo(360, 6);
  });
  it("period 0 = prorated first period", () => {
    expect(num("=AMORDEGRC(2400,39679,39813,300,0,0.15,1)")).toBe(330);
    expect(num("=AMORLINC(2400,39679,39813,300,0,0.15,1)")).toBeCloseTo(131.8, 1);
  });
  it("AMORLINC last periods", () => {
    expect(num("=AMORLINC(2400,39679,39813,300,5,0.15,1)")).toBeCloseTo(360, 6);
    expect(num("=AMORLINC(2400,39679,39813,300,6,0.15,1)")).toBeCloseTo(168.2, 1);
    expect(num("=AMORLINC(2400,39679,39813,300,7,0.15,1)")).toBe(0);
  });
  it("AMORDEGRC schedule to end of life", () => {
    const got = [2, 3, 4, 5, 6].map((p) => num(`=AMORDEGRC(2400,39679,39813,300,${p},0.15,1)`));
    expect(got).toEqual([485, 303, 190, 158, 0]);
  });
  it("bad basis or rate -> #NUM!", () => {
    expect(show("=AMORLINC(2400,39679,39813,300,1,0.15,2)")).toBe("#NUM!");
    expect(show("=AMORDEGRC(2400,39679,39813,300,1,0,1)")).toBe("#NUM!");
  });
});
