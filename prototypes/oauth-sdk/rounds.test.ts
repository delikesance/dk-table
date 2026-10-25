/** Planificateur des tournees : rotation des cartes bloquees, progres par etat, raisons d'arret claires. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStateStore } from "./runState";
import { createPlanner, runRounds, stopMessage } from "./rounds";

const card = (id: string, state: BoardCard["state"]) => ({ id, title: id, source: "s", state }) as BoardCard;

describe("createPlanner", () => {
  it("snapshot/restore: un planificateur repris apres un crash retrouve ses echecs et ses tournees", () => {
    const p = createPlanner({ batch: 1, patience: 3 });
    const cards = [card("dur", "en-cours"), card("a", "idee")];
    for (let i = 0; i < 3; i++) { p.nextBatch(cards); p.observe(cards); }
    const snap = JSON.parse(JSON.stringify(p.snapshot()));
    const q = createPlanner({ batch: 1, patience: 3 });
    q.restore(snap);
    expect(p.attempt(["dur"])).toBeGreaterThan(0);
    expect(q.attempt(["dur"])).toBe(p.attempt(["dur"]));
    expect(q.stuck()).toBe(p.stuck());
  });

  it("lots de 6 cartes: les plus avancees d'abord", () => {
    const p = createPlanner();
    const cards = Array.from({ length: 10 }, (_, i) => card(`i${i}`, "idee")).concat([card("p", "preuves"), card("e", "en-cours")]);
    const b = p.nextBatch(cards);
    expect(b).toHaveLength(6);
    expect(b.slice(0, 2).map((c) => c.id)).toEqual(["p", "e"]);
  });

  it("une carte bloquee par le code n'est plus jamais dans le lot, meme s'il ne reste qu'elle", () => {
    const p = createPlanner({ batch: 2 });
    const cards = [{ ...card("dur", "bloque"), blockReason: "3 essais" } as BoardCard, card("a", "idee")];
    expect(p.nextBatch(cards).map((c) => c.id)).toEqual(["a"]);
    expect(p.nextBatch([cards[0]])).toEqual([]);
  });

  it("idee -> bloque n'est pas un progres (bloque ne compte pas comme en-cours)", () => {
    const p = createPlanner({ patience: 1 });
    p.observe([card("a", "idee")]);
    p.nextBatch([card("a", "idee")]);
    expect(p.observe([card("a", "bloque")])).toBe(false);
    expect(p.stuck()).toBe(true);
  });

  it("le progres compte chaque avancee d'etat (idee -> en-cours -> preuves), pas seulement « termine »", () => {
    const p = createPlanner({ patience: 2 });
    p.observe([card("a", "idee")]);
    p.nextBatch([card("a", "idee")]);
    expect(p.observe([card("a", "en-cours")])).toBe(true);
    expect(p.observe([card("a", "preuves")])).toBe(true);
    expect(p.observe([card("a", "preuves")])).toBe(false);
    expect(p.stuck()).toBe(false);          // 1 tournee sans progres < patience 2
    p.observe([card("a", "preuves")]);
    expect(p.stuck()).toBe(true);
  });

  it("jusqu'a 40 tournees (le budget reste le vrai plafond)", () => {
    expect(createPlanner().maxRounds).toBe(40);
  });
});

describe("stopMessage", () => {
  const left = [card("a", "en-cours"), card("b", "idee")];
  it("distingue terminee, budget epuise, bloquee, arretee, tournees max", () => {
    expect(stopMessage("complete", [])).toMatch(/toutes les cartes/);
    expect(stopMessage("budget", left)).toMatch(/budget epuise.*2 carte/i);
    expect(stopMessage("stuck", left)).toMatch(/bloquee.*a \(en-cours\), b \(idee\)/i);
    expect(stopMessage("abort", left)).toMatch(/arrete/i);
    expect(stopMessage("max-rounds", left)).toMatch(/tournees max/i);
  });
});

describe("runRounds: borne dure d'essais", () => {
  it("3 essais sans carte terminee: carte bloquee avec raison, plus d'agent, arret « blocked »", async () => {
    const st = createFileStateStore(join(mkdtempSync(join(tmpdir(), "rr-")), "state.json"));
    let impl = 0;
    const board = async () => [{ ...card("a", "en-cours"), ...(st.load().cards.a?.deferred ? { state: "bloque", blockReason: st.load().cards.a.deferred!.reason } : {}) } as BoardCard];
    const r = await runRounds({
      board, state: st, emit: () => {}, halt: () => null, progress: () => {}, corr: async () => true,
      impl: async () => { impl++; st.update((s) => { const c = s.cards.a ?? { tries: 0, models: [] }; c.tries++; c.lastReason = "tests rouges"; s.cards.a = c; }); return { merged: false }; },
    });
    expect(impl).toBe(3);
    expect(r.reason).toBe("blocked");
    expect(st.load().cards.a.deferred).toMatchObject({ kind: "max-tries" });
    expect(stopMessage("blocked", [{ ...card("a", "bloque"), blockReason: "3 essais" } as BoardCard])).toContain("a (3 essais)");
  });
});

describe("runRounds: preuves ecrites par le code", () => {
  const stuck = (missing: string[]): BoardCard => ({ ...card("a", "preuves"), missing } as BoardCard);
  it("preuves seules manquantes: le code les ecrit, aucun agent de correction", async () => {
    let proved = false, corr = 0;
    const board = async () => [proved ? card("a", "termine") : stuck(["preuves"])];
    const r = await runRounds({ board, impl: async () => ({ merged: true }), corr: async () => { corr++; return true; }, emit: () => {}, halt: () => null, progress: () => {}, prove: async (cs) => { proved = true; return cs.map((x) => x.id); } });
    expect(r.complete).toBe(true);
    expect(corr).toBe(0);
  });
  it("autre chose que les preuves (fait, captures): la correction reste a l'agent", async () => {
    let corr = 0, proves = 0, done = false;
    const board = async () => [done ? card("a", "termine") : stuck(["captures"])];
    await runRounds({ board, impl: async () => ({ merged: true }), corr: async () => { corr++; done = true; return true; }, emit: () => {}, halt: () => null, progress: () => {}, prove: async () => { proves++; return []; } });
    expect(proves).toBe(0);
    expect(corr).toBe(1);
  });
});

describe("runRounds: etat persistant", () => {
  const mk = (state: ReturnType<typeof createFileStateStore>, cards: () => BoardCard[]) => ({
    board: async () => cards(), impl: async () => ({ merged: true }), corr: async () => true,
    emit: () => {}, halt: () => null, progress: () => {}, state, spent: () => 2.5,
  });
  it("ecrit planificateur, avoid et budget; marque le run termine", async () => {
    const st = createFileStateStore(join(mkdtempSync(join(tmpdir(), "rr-")), "state.json"));
    let n = 0;
    const cards = () => (n++ < 2 ? [card("a", "idee")] : [card("a", "termine")]);
    await runRounds(mk(st, cards));
    const s = st.load();
    expect(s.finished).toBe(true);
    expect(s.budget.spentUsd).toBe(2.5);
    expect(s.planner.rounds).toBeGreaterThan(0);
  });
  it("run interrompu (finished=false): reprend les echecs et avoid", async () => {
    const st = createFileStateStore(join(mkdtempSync(join(tmpdir(), "rr-")), "state.json"));
    st.update((s) => { s.finished = false; s.avoid = ["a"]; s.planner.fails = { a: 2 }; s.planner.idle = 2; });
    const seen: string[] = [];
    const c = { ...mk(st, () => [card("a", "idee")]), impl: async (_t: string, _a: number, cs: BoardCard[]) => { seen.push(...cs.map((x) => x.id)); return { merged: true }; } };
    const r = await runRounds(c);
    expect(r.reason).toBe("stuck"); // idle=2 repris + 1 tournee sans avancee = patience 3
  });
});
