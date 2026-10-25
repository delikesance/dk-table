/** Reprise de session SDK: option `resume`, cout cumule retranche, repli sur session neuve, passe 2 en continuation. */
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import type { QueryFn } from "./research";
import { runSector, SECTOR_DEFS, SECTORS } from "./sectors";

type Call = { prompt: string; options: Record<string, unknown> };
/** Faux SDK: chaque appel renvoie le script suivant (resultat ou exception). */
function fake(script: (c: Call, n: number) => Record<string, unknown>[] | Error) {
  const calls: Call[] = [];
  const q: QueryFn = (a) => (async function* () {
    calls.push({ prompt: a.prompt, options: a.options });
    const r = script(a, calls.length);
    if (r instanceof Error) throw r;
    for (const m of r) yield m as never;
  })();
  return { q, calls };
}
const result = (o: Record<string, unknown> = {}) => ({ type: "result", subtype: "success", total_cost_usd: 1, session_id: "s1", result: "ok", ...o });
const impl = SECTOR_DEFS.find((d) => d.id === "implementation")!;

describe("runSector: reprise de session", () => {
  it("capture session_id et cout cumule", async () => {
    const { q } = fake(() => [result({ total_cost_usd: 0.4 })]);
    expect(await runSector(impl, { query: q, maxBudgetUsd: 2 })).toMatchObject({ sessionId: "s1", sessionCostUsd: 0.4, costUsd: 0.4 });
  });
  it("resume: option SDK `resume` + prompt de reprise; cout = cumul moins le cout deja paye", async () => {
    const { q, calls } = fake(() => [result({ total_cost_usd: 1.5, session_id: "s1" })]);
    const r = await runSector(impl, { query: q, maxBudgetUsd: 2, resume: { sessionId: "s1", priorCostUsd: 1.2, prompt: "corrige" } });
    expect(calls).toHaveLength(1);
    expect(calls[0].options.resume).toBe("s1");
    expect(calls[0].prompt).toBe("corrige");
    expect(r.costUsd).toBeCloseTo(0.3);
    expect(r.resumeFailed).toBe(false);
  });
  it("reprise sans resultat (session introuvable): repli sur une session neuve avec le prompt complet", async () => {
    const { q, calls } = fake((c) => (c.options.resume ? [{ type: "system" }] : [result({ session_id: "s2" })]));
    const r = await runSector(impl, { query: q, maxBudgetUsd: 2, resume: { sessionId: "gone", priorCostUsd: 0, prompt: "corrige" } });
    expect(calls).toHaveLength(2);
    expect(calls[1].options.resume).toBeUndefined();
    expect(calls[1].prompt).toBe(impl.prompt);
    expect(r).toMatchObject({ ok: true, sessionId: "s2", resumeFailed: true });
  });
  it("reprise qui leve: meme repli; abandon demande: l'erreur remonte", async () => {
    const f = fake((c) => (c.options.resume ? new Error("session absente") : [result()]));
    expect((await runSector(impl, { query: f.q, maxBudgetUsd: 2, resume: { sessionId: "x", priorCostUsd: 0, prompt: "p" } })).ok).toBe(true);
    const ac = new AbortController(); ac.abort();
    await expect(runSector(impl, { query: fake(() => new Error("abort")).q, maxBudgetUsd: 2, abort: ac, resume: { sessionId: "x", priorCostUsd: 0, prompt: "p" } })).rejects.toThrow("abort");
  });
});

describe("secteur implementation: passes et reprise", () => {
  const sector = SECTORS.find((s) => s.name === "implementation")!;
  const ctx = (q: QueryFn, extra = {}) => ({ query: q, budget: createBudget(100, 1), emit: () => {}, dir: "/w", signal: new AbortController().signal, task: "TACHE", ...extra });
  it("passe 1 en echec: la passe 2 reprend la session de la passe 1 (continuation), modele du cran suivant", async () => {
    const { q, calls } = fake((_c, n) => [result({ subtype: n === 1 ? "error_max_turns" : "success", session_id: `s${n}`, total_cost_usd: n === 1 ? 1 : 1.5 })]);
    const out = await sector.run(ctx(q));
    expect(calls).toHaveLength(2);
    expect(calls[0].options.resume).toBeUndefined();
    expect(calls[1].options.resume).toBe("s1");
    expect(calls[1].prompt).toMatch(/Reprends/);
    expect(out).toMatchObject({ models: ["haiku", "sonnet"], sessionId: "s2" });
  });
  it("essai suivant dans le meme worktree: reprise de la session memorisee avec la consigne de retry", async () => {
    const { q, calls } = fake(() => [result({ session_id: "s1", total_cost_usd: 3 })]);
    await sector.run(ctx(q, { resume: { sessionId: "s1", costUsd: 2.5 }, task: "REGLES + ECHEC: tests rouges", retryPrompt: "ECHEC: tests rouges" }));
    expect(calls[0].options.resume).toBe("s1");
    expect(calls[0].prompt).toBe("ECHEC: tests rouges");
  });
  it("le cout d'une session reprise n'est pas compte deux fois dans le budget", async () => {
    const { q } = fake(() => [result({ total_cost_usd: 3 })]);
    const c = ctx(q, { resume: { sessionId: "s1", costUsd: 2.5 } });
    await sector.run(c);
    expect(c.budget.spent()).toBeCloseTo(0.5);
  });
});
