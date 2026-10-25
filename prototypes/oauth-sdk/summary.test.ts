/** Tests du resume de phase (query factice, sans cout reel). */
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import type { QueryFn } from "./research";
import { summarizePhase, type PhaseState } from "./summary";

const state: PhaseState = {
  phase: "implementation",
  phases: [
    { name: "recherche", status: "ok" },
    { name: "implémentation", status: "running" },
    { name: "correction", status: "pending" },
  ],
  agents: [{ name: "sheet", status: "running", costUsd: 0.2 }],
  spentUsd: 1, remainingUsd: 9,
};

const reply = (text: string, cost = 0.01): QueryFn => () =>
  (async function* () { yield { type: "result", subtype: "success", result: text, total_cost_usd: cost }; })();

describe("summarizePhase", () => {
  it("renvoie la reponse du modele (haiku, 1 tour, sans outil, plafond 0.05) et regle le cout", async () => {
    const budget = createBudget(10, 1);
    let opts: Record<string, unknown> = {};
    const q: QueryFn = (a) => { opts = a.options; return reply("  Les agents codent.  ")(a); };
    const s = await summarizePhase(state, { query: q, budget });
    expect(s).toBe("Les agents codent.");
    expect(opts).toMatchObject({ model: "haiku", maxTurns: 1, maxBudgetUsd: 0.05, tools: [] });
    expect(budget.spent()).toBeCloseTo(0.01);
    expect(budget.remaining()).toBeCloseTo(10 - 0.01);
  });

  it("repli deterministe si query leve", async () => {
    const q: QueryFn = () => { throw new Error("boom"); };
    expect(await summarizePhase(state, { query: q })).toBe("Terminé : recherche. En cours : implémentation.");
  });

  it("repli si budget epuise (sans appeler query)", async () => {
    const budget = createBudget(1, 1);
    budget.settle(0, 0.95);
    let called = false;
    const q: QueryFn = (a) => { called = true; return reply("x")(a); };
    expect(await summarizePhase(state, { query: q, budget })).toMatch(/^Terminé : recherche\./);
    expect(called).toBe(false);
  });

  it("repli si reponse vide ou jeton absent", async () => {
    expect(await summarizePhase(state, { query: reply("  ") })).toMatch(/^Terminé : recherche\./);
    expect(await summarizePhase(state, { query: reply("ok"), env: {} })).toMatch(/^Terminé : recherche\./);
  });

  it("repli sans rien de termine ni en cours", async () => {
    const s = { ...state, phases: [{ name: "recherche", status: "pending" as const }] };
    expect(await summarizePhase(s, { query: reply("") })).toBe("Aucune phase démarrée.");
  });
});
