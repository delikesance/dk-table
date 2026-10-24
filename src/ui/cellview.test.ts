// @vitest-environment jsdom
/**
 * Tests for cellview: model CellStyle -> DOM style (fill, bold, italic, align; no text
 * color exists in the model), live SPARKLINE/BAR/TREND cell rendering, numfmt display.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { paintStyle, liveCell } from "./cellview";
import { buildSheet } from "./model";
import { registerLive } from "../engine/live/adapter";
import { formatValue } from "./numfmt";

/** Host containing a single grid cell with key A1. */
function host(): HTMLElement {
  const h = document.createElement("div");
  h.innerHTML = '<div class="dkg-cell" data-key="A1"></div>';
  return h;
}
const cell = (h: HTMLElement): HTMLElement => h.querySelector(".dkg-cell") as HTMLElement;

describe("paintStyle", () => {
  it("applies background fill", () => {
    const h = host();
    paintStyle(h, "A1", { fill: "#ff0000" });
    expect(cell(h).style.background).toBe("rgb(255, 0, 0)");
  });
  it("applies bold, italic and alignment", () => {
    const h = host();
    paintStyle(h, "A1", { bold: true, italic: true, align: "right" });
    const s = cell(h).style;
    expect([s.fontWeight, s.fontStyle, s.textAlign]).toEqual(["700", "italic", "right"]);
  });
  it("style without value (empty / undefined) clears everything", () => {
    const h = host();
    paintStyle(h, "A1", { fill: "#00ff00", bold: true, italic: true, align: "center" });
    paintStyle(h, "A1", {});
    expect(cell(h).getAttribute("style") ?? "").toBe("");
    paintStyle(h, "A1");
    expect(cell(h).style.background).toBe("");
  });
  it("clearing fill alone keeps other props", () => {
    const h = host();
    paintStyle(h, "A1", { fill: "#00ff00", bold: true });
    paintStyle(h, "A1", { bold: true });
    expect(cell(h).style.background).toBe("");
    expect(cell(h).style.fontWeight).toBe("700");
  });
  it("is a no-op for an absent cell", () => {
    const h = host();
    expect(() => paintStyle(h, "Z9", { fill: "red" })).not.toThrow();
    expect(cell(h).style.background).toBe("");
  });
});

describe("liveCell", () => {
  beforeAll(() => registerLive());
  const sheet = buildSheet({
    A1: { raw: "1" }, A2: { raw: "3" }, A3: { raw: "2" },
    B1: { raw: "=SPARKLINE(A1:A3)" }, B2: { raw: "=BAR(A1:A3)" }, B3: { raw: "=TREND(A1:A3)" },
    B4: { raw: "hello" }, B5: { raw: "=SUM(A1:A3)" },
  });
  it("renders SPARKLINE as svg polyline", () => {
    const el = liveCell(sheet, "B1")!;
    expect(el.className).toBe("dk-live");
    expect(el.querySelector("svg polyline")).not.toBeNull();
  });
  it("renders BAR as svg rects", () => {
    expect(liveCell(sheet, "B2")!.querySelectorAll("svg rect").length).toBe(3);
  });
  it("renders TREND html", () => {
    expect(liveCell(sheet, "B3")!.innerHTML).not.toBe("");
  });
  it("returns null for plain, formula, and empty cells", () => {
    for (const k of ["B4", "B5", "C9"]) expect(liveCell(sheet, k)).toBeNull();
  });
});

describe("numfmt display", () => {
  it("applies number/percent/currency formats", () => {
    expect(formatValue("1234.5", "number")).toMatch(/1\s234,50/);
    expect(formatValue("0.25", "percent")).toMatch(/25\s?%/);
    expect(formatValue("5", "currency")).toContain("€");
  });
  it("leaves empty, text, unknown or missing format unchanged", () => {
    expect(formatValue("", "number")).toBe("");
    expect(formatValue("abc", "number")).toBe("abc");
    expect(formatValue("5", "weird")).toBe("5");
    expect(formatValue("5")).toBe("5");
  });
});
