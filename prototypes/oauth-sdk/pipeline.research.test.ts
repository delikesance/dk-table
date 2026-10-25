/** Recherche sautee quand le moodboard a deja assez de cartes non terminees (aucun appel modele). */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

const run: Run = async (cmd, args) =>
  cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref" ? { code: 0, out: "developpement\n" }
    : cmd === "git" && args[0] === "status" ? { code: 0, out: " M f\n" } : { code: 0, out: "" };
const cards = (n: number, state: BoardCard["state"] = "idee") =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, title: `c${i}`, source: "s", status: "found", summary: "", state, reportPath: "", missing: [], anomalies: [] }) as BoardCard);

async function go(board: BoardCard[], env: Record<string, string> = {}) {
  const prompts: string[] = [];
  const q: QueryFn = ({ prompt }) => { prompts.push(prompt); const k = prompts.length * 3; return (async function* () { yield { type: "result", subtype: "success", result: [0, 1, 2].map((i) => `- **idee ${k + i}** : y`).join("\n"), total_cost_usd: 0.01 }; })(); };
  const events: BoucleEvent[] = [];
  // `unfinished` = etat avant recherche; ensuite tout est termine pour finir la boucle
  const p = createPipeline({
    query: q, run, cwd: "/repo", env, eurUsd: 1, writeFile: () => {}, watchReports: () => () => {},
    unfinished: async () => board.filter((c) => c.state !== "termine").length,
    board: async () => board.map((c) => ({ ...c, state: "termine" as const })),
  });
  await p({ budgetEur: 50, onEvent: (e) => events.push(e), signal: new AbortController().signal });
  return { researchCalls: prompts.filter((x) => x.includes("Compare Excel")).length, events };
}

describe("recherche sautee", () => {
  it("12 cartes non terminees ou plus: aucune requete de recherche, evenement explicite, phase marquee faite", async () => {
    const r = await go(cards(12));
    expect(r.researchCalls).toBe(0);
    expect(r.events.some((e) => e.sector === "research" && /recherche ignoree : 12 carte/.test(e.message ?? ""))).toBe(true);
    expect(r.events.some((e) => e.type === "end" && e.sector === "research" && e.ok === true)).toBe(true);
  });
  it("moins de 12 cartes non terminees: la recherche tourne (4 axes)", async () => {
    expect((await go(cards(11))).researchCalls).toBe(4);
  });
  it("les cartes terminees ne comptent pas", async () => {
    expect((await go([...cards(10), ...cards(5, "termine").map((c, i) => ({ ...c, id: `t${i}` }))])).researchCalls).toBe(4);
  });
  it("seuil reglable par BOUCLE_RESEARCH_MIN", async () => {
    expect((await go(cards(3), { BOUCLE_RESEARCH_MIN: "3" })).researchCalls).toBe(0);
  });
});
