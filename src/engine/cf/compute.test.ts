/** Conditional formatting evaluation: one test per rule type, priority merge, formulas. */
import { describe, expect, it } from "vitest";
import { computeCf, cellsOf } from "./compute";
import { sheetEnv } from "./env";
import { createSheet, setCell } from "../sheet";
import type { CfRule } from "./types";

const RED = { fill: "#fde2e0" };
const GREEN = { fill: "#d9f2dd" };

/** Sheet with A1..A5 = 10, 20, 30, 40, 50 and extra cells. */
function sheet(extra: Record<string, string> = {}) {
  const s = createSheet();
  [10, 20, 30, 40, 50].forEach((v, i) => setCell(s, `A${i + 1}`, String(v)));
  for (const [k, v] of Object.entries(extra)) setCell(s, k, v);
  return s;
}
const run = (rules: CfRule[], extra?: Record<string, string>) => {
  const s = sheet(extra);
  return computeCf(rules, sheetEnv(s));
};
const hit = (m: Map<string, unknown>) => [...m.keys()].sort();
const r = (p: Record<string, unknown>): CfRule => ({ id: "x", range: "A1:A5", format: RED, ...p }) as CfRule;

describe("cellsOf", () => {
  it("expands ranges and lists, ignores junk", () => {
    expect(cellsOf("A1:B2")).toEqual(["A1", "B1", "A2", "B2"]);
    expect(cellsOf("b3, A1")).toEqual(["B3", "A1"]);
    expect(cellsOf("$A$1:$A$2")).toEqual(["A1", "A2"]);
    expect(cellsOf("zz")).toEqual([]);
  });
});

describe("computeCf", () => {
  it("cell value comparisons", () => {
    expect(hit(run([r({ type: "cell", op: "gt", a: "30" })]))).toEqual(["A4", "A5"]);
    expect(hit(run([r({ type: "cell", op: "le", a: "20" })]))).toEqual(["A1", "A2"]);
    expect(hit(run([r({ type: "cell", op: "eq", a: "30" })]))).toEqual(["A3"]);
    expect(hit(run([r({ type: "cell", op: "between", a: "40", b: "20" })]))).toEqual(["A2", "A3", "A4"]);
    expect(hit(run([r({ type: "cell", op: "notBetween", a: "20", b: "40" })]))).toEqual(["A1", "A5"]);
  });
  it("cell operands: decimal comma, text (case-insensitive), formula", () => {
    expect(hit(run([r({ type: "cell", op: "lt", a: "10,5" })]))).toEqual(["A1"]);
    expect(hit(run([r({ type: "cell", op: "eq", a: "oui", range: "B1:B2" })], { B1: "OUI", B2: "non" }))).toEqual(["B1"]);
    expect(hit(run([r({ type: "cell", op: "ge", a: "=AVERAGE(A1:A5)" })]))).toEqual(["A3", "A4", "A5"]);
  });
  it("empty cells never match a value rule", () => {
    expect(hit(run([r({ type: "cell", op: "lt", a: "5", range: "A1:A7" })]))).toEqual([]);
  });
  it("text rules", () => {
    const extra = { B1: "Paris", B2: "Lyon", B3: "Marseille" };
    const t = (op: string, text: string) => hit(run([r({ type: "text", op, text, range: "B1:B3" })], extra));
    expect(t("contains", "ar")).toEqual(["B1", "B3"]);
    expect(t("notContains", "ar")).toEqual(["B2"]);
    expect(t("begins", "ly")).toEqual(["B2"]);
    expect(t("ends", "LE")).toEqual(["B3"]);
  });
  it("blanks, errors", () => {
    const extra = { B1: "=1/0", B2: "x" };
    expect(hit(run([r({ type: "blank", range: "B1:B3" })], extra))).toEqual(["B3"]);
    expect(hit(run([r({ type: "notBlank", range: "B1:B3" })], extra))).toEqual(["B1", "B2"]);
    expect(hit(run([r({ type: "error", range: "B1:B3" })], extra))).toEqual(["B1"]);
    expect(hit(run([r({ type: "noError", range: "B1:B3" })], extra))).toEqual(["B2", "B3"]);
  });
  it("duplicates / unique values", () => {
    const extra = { B1: "a", B2: "A", B3: "b", B4: "1", B5: "1" };
    expect(hit(run([r({ type: "duplicate", range: "B1:B6" })], extra))).toEqual(["B1", "B2", "B4", "B5"]);
    expect(hit(run([r({ type: "unique", range: "B1:B6" })], extra))).toEqual(["B3"]);
  });
  it("top / bottom n and percent, average", () => {
    expect(hit(run([r({ type: "top", n: 2 })]))).toEqual(["A4", "A5"]);
    expect(hit(run([r({ type: "bottom", n: 1 })]))).toEqual(["A1"]);
    expect(hit(run([r({ type: "top", n: 40, percent: true })]))).toEqual(["A4", "A5"]);
    expect(hit(run([r({ type: "aboveAvg" })]))).toEqual(["A4", "A5"]);
    expect(hit(run([r({ type: "belowAvg" })]))).toEqual(["A1", "A2"]);
  });
  it("formula rules are relative to the range's top-left cell", () => {
    const m = run([r({ type: "formula", formula: "=B1=\"x\"", range: "A1:A3" })], { B2: "x" });
    expect(hit(m)).toEqual(["A2"]);
    const abs = run([r({ type: "formula", formula: "=$A1>$A$3", range: "A1:A5" })]);
    expect(hit(abs)).toEqual(["A4", "A5"]);
  });
  it("first rule wins per property; later rules fill the rest", () => {
    const m = run([
      r({ type: "cell", op: "gt", a: "30", format: RED }),
      r({ type: "cell", op: "gt", a: "0", format: { ...GREEN, bold: true } }),
    ]);
    expect(m.get("A5")).toEqual({ fill: RED.fill, bold: true });
    expect(m.get("A1")).toEqual({ fill: GREEN.fill, bold: true });
  });
  it("color scale interpolates fills between min and max", () => {
    const m = run([{ id: "s", range: "A1:A5", type: "scale", min: "#ffffff", max: "#0000ff" }]);
    expect(m.get("A1")).toEqual({ fill: "#ffffff" });
    expect(m.get("A5")).toEqual({ fill: "#0000ff" });
    expect(m.get("A3")).toEqual({ fill: "#8080ff" });
  });
  it("3-color scale uses the median as midpoint", () => {
    const m = run([{ id: "s", range: "A1:A5", type: "scale", min: "#ff0000", mid: "#ffffff", max: "#0000ff" }]);
    expect(m.get("A3")).toEqual({ fill: "#ffffff" });
    expect(m.get("A2")).toEqual({ fill: "#ff8080" });
  });
  it("data bars are proportional to the value (from 0)", () => {
    const m = run([{ id: "b", range: "A1:A5", type: "bar", color: "#0000f2" }]);
    expect(m.get("A5")).toEqual({ bar: { pct: 100, color: "#0000f2" } });
    expect(m.get("A1")).toEqual({ bar: { pct: 20, color: "#0000f2" } });
  });
  it("broken rules are ignored", () => {
    expect(hit(run([r({ type: "formula", formula: "=(" }), r({ type: "cell", op: "gt", a: "x", range: "nope" })]))).toEqual([]);
  });
});

describe("isDark", () => {
  it("separates dark fills from pastel ones", async () => {
    const { isDark } = await import("./scale");
    expect(isDark("#0000f2")).toBe(true);
    expect(isDark("#19192f")).toBe(true);
    expect(isDark("#fde2e0")).toBe(false);
    expect(isDark("#c6c6ff")).toBe(false);
  });
});
