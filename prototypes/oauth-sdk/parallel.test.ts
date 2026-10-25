/** Tournee parallele: concurrence, serie pour les cartes liees, repli sur conflit, erreurs isolees (faux agents). */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import { runBatch, type BatchCtx } from "./parallel";
import type { BoucleEvent } from "./server";

const card = (id: string, source = "") => ({ id, title: id, source, summary: "", state: "idee", missing: [] }) as unknown as BoardCard;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Contexte factice: `run` enregistre chaque appel (cartes, tentative) et simule `ms` de travail. */
function ctx(o: Partial<BatchCtx> & { ms?: number; results?: (ids: string[], call: number) => { merged: boolean; conflict?: boolean } | Error } = {}) {
  const calls: { ids: string[]; attempt: number; start: number; end: number }[] = [];
  const events: BoucleEvent[] = [];
  let now = 0, peak = 0;
  const t0 = Date.now();
  const c: BatchCtx = {
    n: 3, avoid: new Set(), stop: () => false, emit: (e) => events.push(e),
    attempt: () => 0, rules: (cs) => cs.map((x) => x.id).join(","),
    run: async (cs, task, attempt) => {
      const rec = { ids: cs.map((x) => x.id), attempt, start: Date.now() - t0, end: 0 };
      calls.push(rec); peak = Math.max(peak, ++now);
      await sleep(o.ms ?? 20); now--; rec.end = Date.now() - t0;
      const r = o.results?.(rec.ids, calls.length) ?? { merged: true };
      if (r instanceof Error) throw r;
      return r;
    },
    ...o,
  };
  return { c, calls, events, peak: () => peak };
}

describe("runBatch", () => {
  it("cartes independantes: lancees ensemble (3 a la fois), toutes fusionnees", async () => {
    const h = ctx();
    const ok = await runBatch([card("a"), card("b"), card("d"), card("e")], h.c);
    expect(ok).toBe(true);
    expect(h.peak()).toBe(3);
    expect(h.calls.map((x) => x.ids).sort()).toEqual([["a"], ["b"], ["d"], ["e"]]);
  });
  it("gain de temps: 6 cartes de 30 ms, 3 en parallele = environ 2 temps au lieu de 6", async () => {
    const t = Date.now();
    await runBatch(["a", "b", "c", "d", "e", "f"].map((i) => card(i)), ctx({ ms: 30 }).c);
    expect(Date.now() - t).toBeLessThan(6 * 30 * 0.7);
  });
  it("n = 1: un seul agent pour tout le lot (comportement historique)", async () => {
    const h = ctx({ n: 1 });
    await runBatch([card("a"), card("b")], h.c);
    expect(h.calls.map((x) => x.ids)).toEqual([["a", "b"]]);
  });
  it("cartes liees (meme fichier annonce): traitees ensemble en serie par un seul agent, apres les independantes", async () => {
    const h = ctx();
    await runBatch([card("a", "src/x.ts"), card("b", "src/x.ts"), card("d", "src/y.ts")], h.c);
    expect(h.calls.map((x) => x.ids).sort()).toEqual([["a"], ["b"], ["d"]]);
    const b = h.calls.find((x) => x.ids[0] === "b")!, a = h.calls.find((x) => x.ids[0] === "a")!;
    expect(b.start).toBeGreaterThanOrEqual(a.end); // b attend la fin de la phase parallele
  });
  it("conflit a la fusion: la carte est relancee seule apres la phase parallele et memorisee (avoid)", async () => {
    const h = ctx({ results: (ids, call) => (ids[0] === "b" && call <= 3 ? { merged: false, conflict: true } : { merged: true }) });
    const ok = await runBatch([card("a"), card("b"), card("d")], h.c);
    expect(ok).toBe(true);
    const bs = h.calls.filter((x) => x.ids.includes("b"));
    expect(bs).toHaveLength(2);
    expect(bs[1].start).toBeGreaterThanOrEqual(Math.max(...h.calls.filter((x) => x !== bs[1]).map((x) => x.end)) - 1);
    expect(h.c.avoid.has("b")).toBe(true);
    expect(h.events.some((e) => /conflit/.test(e.message ?? "") && /b/.test(e.message ?? ""))).toBe(true);
  });
  it("un agent qui echoue (fusion refusee sans conflit) rend faux, les autres continuent", async () => {
    const h = ctx({ results: (ids) => (ids[0] === "a" ? { merged: false } : { merged: true }) });
    expect(await runBatch([card("a"), card("b")], h.c)).toBe(false);
    expect(h.calls).toHaveLength(2);
  });
  it("un agent qui leve une erreur n'arrete pas les autres", async () => {
    const h = ctx({ results: (ids) => (ids[0] === "a" ? new Error("boom") : { merged: true }) });
    expect(await runBatch([card("a"), card("b"), card("d")], h.c)).toBe(false);
    expect(h.calls).toHaveLength(3);
    expect(h.events.some((e) => e.type === "error" && /boom/.test(e.message ?? ""))).toBe(true);
  });
  it("stop(): les agents non demarres ne partent pas, ceux en cours finissent", async () => {
    const h = ctx({ n: 2 });
    h.c.stop = () => h.calls.length >= 2;
    await runBatch([card("a"), card("b"), card("d"), card("e")], h.c);
    expect(h.calls).toHaveLength(2);
  });
  it("la tentative (modele) vient de la carte: attempt(ids) par agent", async () => {
    const h = ctx({ attempt: (ids) => (ids[0] === "b" ? 2 : 0) });
    await runBatch([card("a"), card("b")], h.c);
    expect(h.calls.find((x) => x.ids[0] === "b")!.attempt).toBe(2);
    expect(h.calls.find((x) => x.ids[0] === "a")!.attempt).toBe(0);
  });
});
