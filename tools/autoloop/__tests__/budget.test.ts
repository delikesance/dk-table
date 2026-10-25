import { describe, expect, it } from "vitest";
import { Budget } from "../budget";

describe("Budget", () => {
  it("cumule coût, tokens et appels", () => {
    const b = new Budget({ budgetUsd: 10, maxCalls: 5 });
    b.record({ costUsd: 1.5, inputTokens: 10, outputTokens: 5 });
    b.record({ costUsd: 0.5, inputTokens: 1, outputTokens: 2 });
    expect(b.snapshot()).toEqual({ costUsd: 2, tokens: 18, calls: 2 });
    expect(b.canContinue()).toBe(true);
  });
  it("s'arrête au plafond de coût", () => {
    const b = new Budget({ budgetUsd: 1, maxCalls: 5 });
    b.record({ costUsd: 1, inputTokens: 0, outputTokens: 0 });
    expect(b.canContinue()).toBe(false);
  });
  it("s'arrête au plafond d'appels (coût OAuth indicatif)", () => {
    const b = new Budget({ budgetUsd: 1000, maxCalls: 2 });
    b.record({ costUsd: 0, inputTokens: 0, outputTokens: 0 });
    b.record({ costUsd: 0, inputTokens: 0, outputTokens: 0 });
    expect(b.canContinue()).toBe(false);
  });
});
