import { describe, it, expect } from "vitest";
import { createBudget, parseBudgetEur } from "./budget";

describe("createBudget", () => {
  it("converts EUR to USD", () => {
    const b = createBudget(10, 1.1);
    expect(b.remaining()).toBeCloseTo(11);
  });
  it("parallel reservations never exceed the cap", () => {
    const b = createBudget(1, 1);
    const grants = [0.4, 0.4, 0.4, 0.4].map((w) => b.reserve(w));
    expect(grants.reduce((a, g) => a + g, 0)).toBeLessThanOrEqual(1 + 1e-9);
    expect(grants[3]).toBeCloseTo(0);
    expect(b.remaining()).toBeCloseTo(0);
  });
  it("settle releases the reservation and records the real cost", () => {
    const b = createBudget(1, 1);
    const g = b.reserve(0.5);
    expect(b.remaining()).toBeCloseTo(0.5);
    b.settle(g, 0.2);
    expect(b.spent()).toBeCloseTo(0.2);
    expect(b.remaining()).toBeCloseTo(0.8);
  });
  it("tolerates cost slightly above granted", () => {
    const b = createBudget(1, 1);
    b.settle(b.reserve(0.5), 0.55);
    expect(b.spent()).toBeCloseTo(0.55);
    expect(b.remaining()).toBeCloseTo(0.45);
  });
  it("is exhausted once spent+reserved >= 90% of cap", () => {
    const b = createBudget(1, 1);
    expect(b.exhausted()).toBe(false);
    const g = b.reserve(0.89);
    expect(b.exhausted()).toBe(false);
    b.settle(g, 0.9);
    expect(b.exhausted()).toBe(true);
  });
  it("counts in-flight reservations toward exhaustion", () => {
    const b = createBudget(1, 1);
    b.reserve(0.95);
    expect(b.exhausted()).toBe(true);
  });
  it("returns 0 when nothing remains", () => {
    const b = createBudget(1, 1);
    b.reserve(1);
    expect(b.reserve(0.1)).toBe(0);
  });
});

describe("parseBudgetEur", () => {
  it("accepts numbers and numeric strings", () => {
    expect(parseBudgetEur(5)).toBe(5);
    expect(parseBudgetEur("12.5")).toBe(12.5);
    expect(parseBudgetEur(100)).toBe(100);
  });
  it("throws on NaN, <=0, >100", () => {
    for (const v of ["abc", undefined, NaN, 0, -1, 100.01, ""]) {
      expect(() => parseBudgetEur(v)).toThrow();
    }
  });
});
