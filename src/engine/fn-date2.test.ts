import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

/** Evaluate `f` in Z1 of a sheet holding `cells`. */
function ev(f: string, cells: Record<string, string> = {}): string {
  const s = createSheet();
  for (const [k, v] of Object.entries(cells)) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}

const MON = "DATE(2024,1,1)"; // a Monday, serial 45292

describe("WEEKDAY", () => {
  it("return types 1, 2, 3, 11-17", () => {
    expect(ev(`=WEEKDAY(${MON})`)).toBe("2");
    expect(ev(`=WEEKDAY(${MON},2)`)).toBe("1");
    expect(ev(`=WEEKDAY(${MON},3)`)).toBe("0");
    expect(ev(`=WEEKDAY(${MON},11)`)).toBe("1");
    expect(ev(`=WEEKDAY(${MON},16)`)).toBe("3");
    expect(ev(`=WEEKDAY(${MON},17)`)).toBe("2");
    expect(ev("=WEEKDAY(1)")).toBe("1");
  });
  it("bad type or negative date -> #NUM!", () => {
    expect(ev(`=WEEKDAY(${MON},4)`)).toBe("#NUM!");
    expect(ev("=WEEKDAY(-1)")).toBe("#NUM!");
    expect(ev('=WEEKDAY("x")')).toBe("#VALUE!");
  });
});

describe("EDATE / EOMONTH", () => {
  it("EDATE clamps to the end of month", () => {
    expect(ev("=DAY(EDATE(DATE(2024,1,31),1))")).toBe("29");
    expect(ev("=MONTH(EDATE(DATE(2024,3,31),-1))")).toBe("2");
    expect(ev("=EDATE(DATE(2024,1,15),12)=DATE(2025,1,15)")).toBe("TRUE");
  });
  it("EOMONTH gives the last day", () => {
    expect(ev("=EOMONTH(DATE(2024,1,15),1)=DATE(2024,2,29)")).toBe("TRUE");
    expect(ev("=EOMONTH(DATE(2024,1,15),-1)=DATE(2023,12,31)")).toBe("TRUE");
    expect(ev("=EOMONTH(-5,0)")).toBe("#NUM!");
  });
});

describe("DAYS / NETWORKDAYS", () => {
  it("DAYS(end, start)", () => {
    expect(ev("=DAYS(DATE(2024,3,1),DATE(2024,2,1))")).toBe("29");
    expect(ev("=DAYS(DATE(2024,2,1),DATE(2024,3,1))")).toBe("-29");
  });
  it("NETWORKDAYS counts Mon-Fri inclusive minus holidays", () => {
    expect(ev(`=NETWORKDAYS(${MON},DATE(2024,1,12))`)).toBe("10");
    expect(ev(`=NETWORKDAYS(${MON},DATE(2024,1,12),A1:A2)`, { A1: `=${MON}`, A2: "=DATE(2024,1,6)" })).toBe("9");
    expect(ev(`=NETWORKDAYS(DATE(2024,1,12),${MON})`)).toBe("-10");
    expect(ev("=NETWORKDAYS(DATE(2024,1,6),DATE(2024,1,7))")).toBe("0");
  });
});

describe("time", () => {
  it("TIME builds a day fraction, wraps past 24h", () => {
    expect(ev("=TIME(12,0,0)")).toBe("0.5");
    expect(ev("=TIME(25,0,0)")).toBe("0.0416666666667");
    expect(ev("=TIME(0,90,0)=TIME(1,30,0)")).toBe("TRUE");
    expect(ev("=TIME(-1,0,0)")).toBe("#NUM!");
  });
  it("HOUR / MINUTE / SECOND", () => {
    expect(ev("=HOUR(TIME(13,45,30))")).toBe("13");
    expect(ev("=MINUTE(TIME(13,45,30))")).toBe("45");
    expect(ev("=SECOND(TIME(13,45,30))")).toBe("30");
    expect(ev("=HOUR(45292.75)")).toBe("18");
    expect(ev("=HOUR(-1)")).toBe("#NUM!");
  });
});
