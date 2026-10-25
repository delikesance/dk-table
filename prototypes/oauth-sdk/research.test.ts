/** Tests du secteur recherche : synthese en 4 axes, plafond de budget (query factice, sans reseau). */
import { describe, expect, it } from "vitest";
import { AXES, runResearch, type QueryFn } from "./research";

/** Fabrique une query factice : chaque appel coute `cost` et renvoie 2 puces. */
function fake(cost: number) {
  const calls: { prompt: string; options: Record<string, unknown> }[] = [];
  const q: QueryFn = ({ prompt, options }) => {
    calls.push({ prompt, options });
    const n = calls.length;
    return (async function* () {
      yield { type: "result", subtype: "success", result: `- idee ${n}a\n- idee ${n}b`, total_cost_usd: cost };
    })();
  };
  return { q, calls };
}

describe("runResearch", () => {
  it("produit 4 titres d'axes avec au moins une puce chacun", async () => {
    const { q } = fake(0.5);
    const out = await runResearch({ query: q, budgetUsd: 20, maxRounds: 1 });
    const heads = out.markdown.match(/^## .+$/gm) ?? [];
    expect(heads).toHaveLength(4);
    for (const a of AXES) {
      const body = out.markdown.split(`## ${a.title}`)[1]?.split(/^## /m)[0] ?? "";
      expect(body).toMatch(/^- /m);
    }
  });

  it("s'arrete des que le cout cumule atteint 90 % du plafond", async () => {
    const { q, calls } = fake(9);
    const out = await runResearch({ query: q, budgetUsd: 20, maxRounds: 5 });
    expect(out.totalCostUsd).toBe(18);
    expect(calls).toHaveLength(2);
  });

  it("transmet le plafond restant au SDK (maxBudgetUsd) et garde dontAsk", async () => {
    const { q, calls } = fake(1);
    await runResearch({ query: q, budgetUsd: 20, maxRounds: 1 });
    expect(calls[0].options.maxBudgetUsd).toBe(20);
    expect(calls[1].options.maxBudgetUsd).toBe(19);
    expect(calls[0].options.permissionMode).toBe("dontAsk");
    expect(calls[0].options.allowedTools).toContain("WebSearch");
  });
});
