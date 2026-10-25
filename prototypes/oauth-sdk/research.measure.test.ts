/** Mesure avant/apres de la recherche (faux agents): appels, modeles, tours, plafond par requete, cout relatif. */
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import { runResearch, type QueryFn } from "./research";
import { costUnits } from "./routing";

/** Ancien comportement (avant ce changement): 4 axes sonnet, 15 tours, 2 passes completes, plafond = reste/4. */
const OLD = { calls: 8, models: Array(8).fill("sonnet") as string[], maxTurns: 15 };

describe("mesure recherche", () => {
  it("4 requetes haiku, 8 tours, une passe, plafond 0,30 $ au lieu de 8 requetes sonnet de 15 tours", async () => {
    const seen: { model: string; turns: number; cap: number }[] = [];
    let n = 0;
    const q: QueryFn = ({ options }) => {
      seen.push({ model: String(options.model), turns: Number(options.maxTurns), cap: Number(options.maxBudgetUsd) });
      const k = n++ * 4;
      return (async function* () { yield { type: "result", subtype: "success", result: [0, 1, 2, 3].map((i) => `- **idee ${k + i}** : x`).join("\n"), total_cost_usd: 0.1 }; })();
    };
    await runResearch({ query: q, budget: createBudget(20, 1.08) });
    const before = costUnits(OLD.models), after = costUnits(seen.map((s) => s.model));
    console.log(`MESURE recherche appels ${OLD.calls} -> ${seen.length}; tours max ${OLD.maxTurns} -> ${Math.max(...seen.map((s) => s.turns))}; cout relatif ${before} -> ${after}; plafond/requete ${(20 * 1.08) / 4} $ -> ${Math.max(...seen.map((s) => s.cap))} $`);
    expect(seen).toHaveLength(4);
    expect(after).toBeLessThan(before / 5);
    expect(Math.max(...seen.map((s) => s.turns))).toBeLessThan(OLD.maxTurns);
  });
});
