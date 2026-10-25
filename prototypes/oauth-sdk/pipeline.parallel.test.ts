/** Agents en parallele dans le pipeline (faux agents, git simule): concurrence, worktrees distincts, fusions un par un, conflit, budget. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

/** Travail simule: `n` passages dans la file d'evenements (aucun chronometre: l'ordre ne depend que de la file, pas de la machine). */
const work = async (n: number) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const card = (id: string, source = "s", state: BoardCard["state"] = "idee") =>
  ({ id, title: id, source, status: "found", summary: "", state, reportPath: "", missing: [], anomalies: [] }) as BoardCard;

interface Opts { cards: BoardCard[]; parallel: number; /** Duree du travail d'un agent, en passages dans la file par carte. */ steps?: number; /** Cartes dont la 1re synchro entre en conflit. */ conflicts?: string[] }
function harness(o: Opts) {
  const done = new Set<string>();
  const impl: { cwd: string; ids: string[]; budget: number; start: number; end: number }[] = [];
  let live = 0, peak = 0, merging = 0, mergePeak = 0;
  const conflicted = new Set<string>();
  let clock = 0; // horloge logique: un tick par debut/fin d'agent
  const q: QueryFn = ({ prompt, options }) => (async function* () {
    const ids = [...prompt.matchAll(/^- (\S+) \(/gm)].map((m) => m[1]);
    const isImpl = prompt.includes("Cartes a traiter");
    const rec = { cwd: String(options.cwd), ids, budget: Number(options.maxBudgetUsd), start: clock++, end: 0 };
    // le travail d'un agent est proportionnel au nombre de cartes qu'il traite
    if (isImpl) { impl.push(rec); peak = Math.max(peak, ++live); await work((o.steps ?? 20) * Math.max(1, ids.length)); live--; ids.forEach((i) => done.add(i)); rec.end = clock++; }
    yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 };
  })();
  const run: Run = async (cmd, args, cwd) => {
    if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
    if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f\n" };
    if (cmd === "git" && args[0] === "merge") {
      if (args.includes("--no-ff")) { mergePeak = Math.max(mergePeak, ++merging); await work(2); merging--; return { code: 0, out: "" }; }
      const id = (o.conflicts ?? []).find((c) => cwd?.includes(c));
      if (id && !conflicted.has(id)) { conflicted.add(id); return { code: 1, out: "CONFLICT" }; }
    }
    return { code: 0, out: "" };
  };
  const events: BoucleEvent[] = [];
  const p = createPipeline({
    query: q, run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, parallel: o.parallel, watchReports: () => () => {},
    board: async () => o.cards.map((c) => (done.has(c.id) ? { ...c, state: "termine" as const } : c)),
  });
  const go = async () => ({ r: await p({ budgetEur: 50, onEvent: (e) => events.push(e), signal: new AbortController().signal }) });
  return { go, impl, events, peak: () => peak, mergePeak: () => mergePeak };
}
const six = () => ["a", "b", "c", "d", "e", "f"].map((i) => card(i, `src/${i}.ts`));

describe("agents en parallele", () => {
  it("6 cartes independantes, 3 agents: simultanes, un worktree chacun, fusions un par un, tout termine", async () => {
    const h = harness({ cards: six(), parallel: 3 });
    const { r } = await h.go();
    expect(r).toEqual({ complete: true, reason: "complete" });
    expect(h.peak()).toBe(3);
    expect(new Set(h.impl.map((x) => x.cwd)).size).toBe(h.impl.length);
    expect(h.impl.map((x) => x.ids.length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(h.mergePeak()).toBe(1);
  });
  it("meme travail: 1 agent = concurrence 1, 3 agents = concurrence 3 (compteur d'agents simultanes, aucun chronometre)", async () => {
    const serial = harness({ cards: six(), parallel: 1, steps: 1 });
    await serial.go();
    const par = harness({ cards: six(), parallel: 3, steps: 1 });
    await par.go();
    expect([serial.peak(), par.peak()]).toEqual([1, 3]);
  });
  it("parallel = 1 (defaut): un seul agent pour tout le lot, comme avant", async () => {
    const h = harness({ cards: six(), parallel: 1 });
    await h.go();
    expect(h.impl).toHaveLength(1);
    expect(h.impl[0].ids).toHaveLength(6);
  });
  it("cartes qui annoncent le meme fichier: pas en parallele", async () => {
    const h = harness({ cards: [card("a", "src/x.ts"), card("b", "src/x.ts"), card("c", "src/y.ts")], parallel: 3 });
    await h.go();
    const b = h.impl.find((x) => x.ids.includes("b"))!, a = h.impl.find((x) => x.ids.includes("a"))!;
    expect(b.start).toBeGreaterThanOrEqual(a.end);
  });
  it("conflit de fusion: la carte est relancee seule apres les autres (nouveau worktree), tout finit termine", async () => {
    const h = harness({ cards: six().slice(0, 3), parallel: 3, conflicts: ["b"] });
    const { r } = await h.go();
    expect(r).toMatchObject({ complete: true });
    expect(h.impl.filter((x) => x.ids.includes("b"))).toHaveLength(2);
    expect(h.events.some((e) => /conflit de fusion sur b/.test(e.message ?? ""))).toBe(true);
  });
  it("budget reparti: chaque agent simultane recoit une part non nulle, la somme ne depasse pas la part du secteur", async () => {
    const h = harness({ cards: six().slice(0, 3), parallel: 3 });
    await h.go();
    const first = h.impl.slice(0, 3).map((x) => x.budget);
    expect(first.every((b) => b > 0)).toBe(true);
    expect(first.reduce((s, b) => s + b, 0)).toBeLessThanOrEqual(50 * 0.4 + 1e-9);
  });
  it("evenements start/end des agents portent la carte (agent)", async () => {
    const h = harness({ cards: six().slice(0, 2), parallel: 2 });
    await h.go();
    const starts = h.events.filter((e) => e.type === "start" && e.sector === "implementation");
    expect(starts.map((e) => e.agent).sort()).toEqual(["a", "b"]);
    expect(h.events.filter((e) => e.type === "end" && e.sector === "implementation").every((e) => e.agent)).toBe(true);
  });
});
