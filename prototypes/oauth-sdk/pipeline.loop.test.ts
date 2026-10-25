/** Tests de la boucle jusqu'a completion : tournees implementation/correction tant que des cartes ne sont pas terminees. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

const run: Run = async (cmd, args) =>
  cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref" ? { code: 0, out: "developpement\n" }
    : cmd === "git" && args[0] === "status" ? { code: 0, out: " M f\n" } : { code: 0, out: "" };

const card = (id: string, state: BoardCard["state"]) => ({ id, title: id, source: "s", status: "found", summary: "", state, reportPath: "", missing: [] }) as BoardCard;

/** Query factice qui enregistre les prompts. */
function harness(boards: BoardCard[][]) {
  const prompts: string[] = [];
  const q: QueryFn = ({ prompt, options }) => {
    prompts.push(prompt);
    return (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: Math.min(0.1, options.maxBudgetUsd as number) }; })();
  };
  let n = 0;
  const events: BoucleEvent[] = [];
  const p = createPipeline({
    query: q, run, cwd: "/repo", eurUsd: 1, writeFile: () => {},
    board: async () => boards[Math.min(n++, boards.length - 1)],
    watchReports: () => () => {},
  });
  const go = (eur = 50) => p({ budgetEur: eur, onEvent: (e) => events.push(e), signal: new AbortController().signal });
  return { go, prompts, events };
}
const impl = (e: BoucleEvent[]) => e.filter((x) => x.type === "start" && x.sector === "implementation");

describe("boucle jusqu'a completion", () => {
  it("repete implementation + correction tant qu'une carte n'est pas terminee, puis complete=true", async () => {
    const h = harness([
      [card("a", "idee"), card("b", "idee")],            // apres recherche
      [card("a", "termine"), card("b", "idee")],         // apres tournee 1
      [card("a", "termine"), card("b", "termine")],      // apres tournee 2
    ]);
    const r = await h.go();
    expect(impl(h.events)).toHaveLength(2);
    expect(r).toEqual({ complete: true });
    expect(h.events.some((e) => e.type === "info" && e.complete === true)).toBe(true);
  });

  it("le prompt d'implementation porte les cartes restantes, les rapports et le trancheur", async () => {
    const h = harness([[card("a", "idee")], [card("a", "termine")]]);
    await h.go();
    const p = h.prompts.find((x) => x.includes("docs/rapports/a.md"));
    expect(p).toBeTruthy();
    expect(p).toMatch(/trancheur/);
  });

  it("deja tout termine apres la recherche: aucune tournee, complete=true", async () => {
    const h = harness([[card("a", "termine")]]);
    expect(await h.go()).toEqual({ complete: true });
    expect(impl(h.events)).toHaveLength(0);
  });

  it("sans progres sur 2 tournees de suite: s'arrete, complete=false, dit lesquelles manquent", async () => {
    const h = harness([[card("a", "idee")], [card("a", "idee")], [card("a", "bloque")], [card("a", "bloque")]]);
    const r = await h.go();
    expect(r).toEqual({ complete: false });
    expect(impl(h.events).length).toBeLessThanOrEqual(3);
    expect(h.events.some((e) => e.type === "info" && /a/.test(e.message ?? "") && /sans progr|non termin/i.test(e.message ?? ""))).toBe(true);
  });

  it("s'arrete quand le budget est epuise (complete=false)", async () => {
    const h = harness([[card("a", "idee")]]);
    expect(await h.go(0.2)).toEqual({ complete: false });
  });

  it("evenements `card` pousses quand un rapport change pendant l'implementation", async () => {
    const events: BoucleEvent[] = [];
    let cb: (id: string) => void = () => {};
    const q: QueryFn = () => (async function* () { cb("a"); yield { type: "result", subtype: "success", result: "-", total_cost_usd: 0.01 }; })();
    const p = createPipeline({
      query: q, run, cwd: "/repo", eurUsd: 1, writeFile: () => {},
      board: async () => [card("a", "termine")], watchReports: (_d, f) => { cb = f; return () => {}; },
    });
    // board deja termine: aucune tournee -> pas de card; on force une carte ouverte
    const p2 = createPipeline({
      query: q, run, cwd: "/repo", eurUsd: 1, writeFile: () => {},
      board: (() => { let i = 0; return async () => [card("a", i++ === 0 ? "idee" : "termine")]; })(), watchReports: (_d, f) => { cb = f; return () => {}; },
    });
    await p2({ budgetEur: 50, onEvent: (e) => events.push(e), signal: new AbortController().signal });
    expect(events.some((e) => e.type === "card" && e.cardId === "a")).toBe(true);
    void p;
  });
});
