/** Surcharge de la boucle : combien de processus Claude lances par un run (mesure avec une query factice qui compte). */
import { describe, expect, it } from "vitest";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";

const run: Run = async (cmd, args) =>
  cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref" ? { code: 0, out: "developpement\n" }
    : cmd === "git" && args[0] === "status" ? { code: 0, out: " M f\n" } : { code: 0, out: "" };

/** Lance un run complet et renvoie le nombre de requetes par type (modele). */
async function count(llmSummaries: boolean) {
  const byModel: Record<string, number> = {};
  const query: QueryFn = ({ options }) => {
    const m = String(options.model);
    byModel[m] = (byModel[m] ?? 0) + 1;
    return (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 }; })();
  };
  const p = createPipeline({ query, run, cwd: "/r", eurUsd: 1, writeFile: () => {}, llmSummaries, env: { CLAUDE_CODE_OAUTH_TOKEN: "x" } });
  await p({ budgetEur: 50, onEvent: () => {}, signal: new AbortController().signal });
  return byModel;
}

describe("surcharge d'un run", () => {
  it("par defaut aucun resume ne lance de processus Haiku (seules la recherche et les 3 secteurs tournent)", async () => {
    const m = await count(false);
    expect(m.haiku ?? 0).toBe(0);
  });
  it("avec llmSummaries: un processus de plus par phase (4)", async () => {
    const off = await count(false), on = await count(true);
    const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(on) - sum(off)).toBe(4);
    expect(on.haiku).toBe(4);
  });
});
