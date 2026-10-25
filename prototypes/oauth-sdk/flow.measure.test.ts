/** Mesure avant/apres (faux agents): appels modele et cout relatif par tournee pour un lot qui se valide du premier coup. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import { costUnits } from "./routing";

const card = (id: string, state: BoardCard["state"]) =>
  ({ id, title: id, source: "s", status: "found", summary: "", state, reportPath: "", missing: [], anomalies: [] }) as BoardCard;

/** Ancien comportement (avant ce changement): implementation sonnet + correction sonnet a chaque tournee, trancheur opus. */
const OLD_PER_ROUND = ["sonnet", "sonnet"];

describe("mesure avant/apres", () => {
  it("12 cartes en 2 tournees valides du premier coup: 2 appels haiku au lieu de 4 appels sonnet", async () => {
    const calls: { model: string; prompt: string }[] = [];
    const run: Run = async (cmd, args) => {
      if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f\n" };
      if (cmd === "git" && args[0] === "rev-parse") return { code: 0, out: "developpement\n" };
      return { code: 0, out: "" };
    };
    const query: QueryFn = ({ prompt, options }) => {
      calls.push({ model: String(options.model), prompt });
      return (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0 }; })();
    };
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    // Une carte de plus validee a chaque tournee d'implementation.
    const implCount = () => calls.filter((c) => c.prompt.includes("Cartes a traiter")).length;
    const p = createPipeline({
      query, run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, watchReports: () => () => {},
      board: async () => ids.map((i, j) => card(i, j < implCount() * 6 ? "termine" : "idee")),
    });
    await p({ budgetEur: 50, onEvent: () => {}, signal: new AbortController().signal });
    const impl = calls.filter((c) => c.prompt.includes("Cartes a traiter")).map((c) => c.model);
    const corr = calls.filter((c) => /termine sans preuve|fusion a ete refusee/.test(c.prompt)).map((c) => c.model);
    const rounds = impl.length;
    const before = costUnits(Array.from({ length: rounds }, () => OLD_PER_ROUND).flat());
    const after = costUnits([...impl, ...corr]);
    console.log(`MESURE tournees=${rounds} appels(impl+corr) avant=${rounds * 2} apres=${impl.length + corr.length} cout avant=${before} apres=${after}`);
    expect(corr).toHaveLength(0);
    expect(impl.every((m) => m === "haiku")).toBe(true);
    expect(after).toBeLessThan(before);
  });
});
