import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, getValue, setCell } from "./sheet";

/** Evaluate `f` in Z1 of a sheet holding `cells`; returns [value, display]. */
function run(f: string, cells: Record<string, string> = {}): [unknown, string] {
  const s = createSheet();
  for (const [k, v] of Object.entries(cells)) setCell(s, k, v);
  setCell(s, "Z1", f);
  return [getValue(s, "Z1"), getDisplay(s, "Z1")];
}
/** Expect a number close to `x`. */
function near(f: string, x: number, cells: Record<string, string> = {}, digits = 6) {
  const [v] = run(f, cells);
  expect(typeof v, f).toBe("number");
  expect(v as number, f).toBeCloseTo(x, digits);
}
/** Cells A1.. (or another column) filled with `xs`. */
function col(xs: (number | string)[], c = "A"): Record<string, string> {
  return Object.fromEntries(xs.map((x, i) => [`${c}${i + 1}`, String(x)]));
}

const FLOWS = col([-10000, 2750, 4250, 3250, 2750]);
const DATES = col([39448, 39508, 39751, 39859, 39904], "B");

describe("IRR", () => {
  it("range", () => near("=IRR(A1:A3)", 0.130662, col([-100, 60, 60])));
  it("scalar args stay flows (backward compatible)", () => near("=IRR(-100,110)", 0.1));
  it("range + guess", () => near("=IRR(A1:A5,0.3)", -0.021245, col([-70000, 12000, 15000, 18000, 21000])));
  it("text and blanks in the range are ignored", () => near("=IRR(A1:A4)", 0.1, { A1: "-100", A2: "x", A4: "110" }));
  it("errors propagate", () => expect(run("=IRR(A1:A2)", { A1: "-100", A2: "=1/0" })[1]).toBe("#DIV/0!"));
  it("no sign change -> #NUM!", () => expect(run("=IRR(A1:A2)", col([100, 110]))[1]).toBe("#NUM!"));
});

describe("MIRR", () => {
  it("Excel example", () =>
    near("=MIRR(A1:A6,0.1,0.12)", 0.126094, col([-120000, 39000, 30000, 21000, 37000, 46000])));
  it("only positives -> #DIV/0!", () => expect(run("=MIRR(A1:A2,0.1,0.1)", col([1, 2]))[1]).toBe("#DIV/0!"));
});

describe("XNPV", () => {
  it("Excel example", () => near("=XNPV(0.09,A1:A5,B1:B5)", 2086.647602, { ...FLOWS, ...DATES }));
  it("mismatched lengths -> #NUM!", () =>
    expect(run("=XNPV(0.09,A1:A5,B1:B4)", { ...FLOWS, ...DATES })[1]).toBe("#NUM!"));
  it("date before the first -> #NUM!", () =>
    expect(run("=XNPV(0.09,A1:A5,B1:B5)", { ...FLOWS, ...DATES, B3: "39000" })[1]).toBe("#NUM!"));
});

describe("XIRR", () => {
  it("Excel example", () => near("=XIRR(A1:A5,B1:B5)", 0.373363, { ...FLOWS, ...DATES }));
  it("with guess", () => near("=XIRR(A1:A5,B1:B5,0.5)", 0.373363, { ...FLOWS, ...DATES }));
  it("mismatched lengths -> #NUM!", () =>
    expect(run("=XIRR(A1:A4,B1:B5)", { ...FLOWS, ...DATES })[1]).toBe("#NUM!"));
  it("no sign change -> #NUM!", () =>
    expect(run("=XIRR(A1:A2,B1:B2)", { A1: "1", A2: "2", B1: "39448", B2: "39508" })[1]).toBe("#NUM!"));
});
