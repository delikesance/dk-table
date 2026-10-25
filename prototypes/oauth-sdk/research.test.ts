/** Tests du secteur recherche : synthese en 4 axes, axes paralleles, plafond de budget, journal (query factice, sans reseau). */
import { describe, expect, it } from "vitest";
import { AXES, runResearch, type QueryFn } from "./research";

/** Query factice : cout `cost` borne par `maxBudgetUsd`, delai `ms`, suit le nombre d'appels simultanes. */
function fake(cost: number, ms = 0) {
  const calls: { prompt: string; options: Record<string, unknown> }[] = [];
  const st = { live: 0, maxLive: 0 };
  const q: QueryFn = ({ prompt, options }) => {
    calls.push({ prompt, options });
    const n = calls.length;
    return (async function* () {
      st.live++;
      st.maxLive = Math.max(st.maxLive, st.live);
      await new Promise((r) => setTimeout(r, ms));
      st.live--;
      const c = Math.min(cost, options.maxBudgetUsd as number);
      yield { type: "result", subtype: "success", result: `- idee ${n}a\n- idee ${n}b`, total_cost_usd: c };
    })();
  };
  return { q, calls, st };
}

describe("runResearch", () => {
  it("produit 4 titres d'axes avec au moins une puce chacun", async () => {
    const { q } = fake(0.5);
    const out = await runResearch({ query: q, budgetUsd: 20, maxRounds: 1 });
    expect((out.markdown.match(/^## .+$/gm) ?? [])).toHaveLength(4);
    for (const a of AXES) {
      const body = out.markdown.split(`## ${a.title}`)[1]?.split(/^## /m)[0] ?? "";
      expect(body).toMatch(/^- /m);
    }
  });

  it("lance les 4 axes en parallele", async () => {
    const { q, st } = fake(0.5, 20);
    await runResearch({ query: q, budgetUsd: 20, maxRounds: 1 });
    expect(st.maxLive).toBe(4);
  });

  it("s'arrete a 90 % du plafond sans jamais depasser le plafond", async () => {
    const { q, calls } = fake(4.5, 5);
    const out = await runResearch({ query: q, budgetUsd: 20, maxRounds: 5 });
    expect(out.totalCostUsd).toBe(18);
    expect(calls).toHaveLength(4);
  });

  it("repartit le reste du budget entre requetes simultanees (somme <= plafond)", async () => {
    const { q, calls } = fake(100, 5);
    const out = await runResearch({ query: q, budgetUsd: 20, maxRounds: 3 });
    expect(calls[0].options.maxBudgetUsd).toBe(5);
    expect(out.totalCostUsd).toBeLessThanOrEqual(20);
    expect(calls[0].options.permissionMode).toBe("dontAsk");
    expect(calls[0].options.allowedTools).toContain("WebSearch");
  });

  it("journalise debut, fin (cout, secondes), total et reste", async () => {
    const { q } = fake(1);
    const lines: string[] = [];
    let t = 0;
    await runResearch({ query: q, budgetUsd: 20, maxRounds: 1, log: (l) => lines.push(l), now: () => (t += 1000) });
    expect(lines.filter((l) => l.includes("debut"))).toHaveLength(4);
    const end = lines.filter((l) => l.includes("fin"));
    expect(end).toHaveLength(4);
    expect(end[3]).toMatch(/\$1\.00/);
    expect(end[3]).toMatch(/\d+s/);
    expect(end[3]).toMatch(/total \$4\.00/);
    expect(end[3]).toMatch(/reste \$16\.00/);
  });
});
