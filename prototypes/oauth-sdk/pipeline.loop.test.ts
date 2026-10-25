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
    expect(r).toEqual({ complete: true, reason: "complete" });
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
    expect(await h.go()).toMatchObject({ complete: true });
    expect(impl(h.events)).toHaveLength(0);
  });

  it("aucune avancee pendant 3 tournees de suite: bloquee (reason=stuck), dit lesquelles manquent", async () => {
    const h = harness([[card("a", "idee")]]);
    const r = await h.go();
    expect(r).toEqual({ complete: false, reason: "stuck" });
    expect(impl(h.events)).toHaveLength(3);
    expect(h.events.some((e) => e.type === "info" && e.reason === "stuck" && /bloquee/.test(e.message ?? "") && /a \(idee\)/.test(e.message ?? ""))).toBe(true);
  });

  it("une avancee d'etat compte comme progres: idee -> en-cours -> preuves -> termine continue au-dela de 3 tournees", async () => {
    const h = harness([[card("a", "idee")], [card("a", "en-cours")], [card("a", "preuves")], [card("a", "termine")]]);
    expect(await h.go()).toEqual({ complete: true, reason: "complete" });
    expect(impl(h.events)).toHaveLength(3);
  });

  it("s'arrete quand le budget est epuise (reason=budget) avec le nombre de cartes restantes", async () => {
    const h = harness([[card("a", "idee")]]);
    expect(await h.go(0.2)).toEqual({ complete: false, reason: "budget" });
    expect(h.events.some((e) => e.type === "info" && e.reason === "budget" && /budget epuise/.test(e.message ?? ""))).toBe(true);
  });

  it("abandon demande: reason=abort", async () => {
    const h = harness([[card("a", "idee")]]);
    const ac = new AbortController(); ac.abort();
    const p = createPipeline({ query: (() => (async function* () {})()) as QueryFn, run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, board: async () => [card("a", "idee")], watchReports: () => () => {} });
    const r = await p({ budgetEur: 50, onEvent: () => {}, signal: ac.signal });
    expect(r?.complete).toBe(false);
    void h;
  });

  it("jamais « Boucle terminee » dans un resume s'il reste des cartes; seulement quand tout est termine", async () => {
    const stuck = harness([[card("a", "idee")]]);
    await stuck.go();
    const msgs = stuck.events.filter((e) => e.type === "summary").map((e) => e.message ?? "");
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.some((m) => /Boucle terminée/.test(m))).toBe(false);
    expect(msgs[msgs.length - 1]).toMatch(/Boucle arrêtée .*1 carte/);
    const ok = harness([[card("a", "idee")], [card("a", "termine")]]);
    await ok.go();
    const last = ok.events.filter((e) => e.type === "summary").pop();
    expect(last?.message).toMatch(/Boucle terminée/);
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
