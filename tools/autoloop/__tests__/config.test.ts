import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, loadConfig } from "../config";

describe("config", () => {
  it("fixe les plafonds par défaut", () => {
    expect(DEFAULT_CONFIG.roles.audit.maxTurns).toBe(15);
    expect(DEFAULT_CONFIG.roles.worker.maxTurns).toBe(30);
    expect(DEFAULT_CONFIG.roles.reviewer.maxTurns).toBe(10);
    expect(DEFAULT_CONFIG.roles.researcher.maxTurns).toBe(8);
    expect(DEFAULT_CONFIG.concurrency).toBe(2);
    expect(DEFAULT_CONFIG.maxOpenPrs).toBe(3);
    expect(DEFAULT_CONFIG.maxIssuesPerCycle).toBe(3);
    expect(DEFAULT_CONFIG.idleCyclesStop).toBe(3);
  });
  it("applique des surcharges partielles sans muter le défaut", () => {
    const c = loadConfig({ budgetUsd: 1, roles: { worker: { maxTurns: 5 } } });
    expect(c.budgetUsd).toBe(1);
    expect(c.roles.worker.maxTurns).toBe(5);
    expect(c.roles.worker.maxBudgetUsd).toBe(DEFAULT_CONFIG.roles.worker.maxBudgetUsd);
    expect(DEFAULT_CONFIG.roles.worker.maxTurns).toBe(30);
  });
});
