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
    const p = createPlanner({ batch: 1, tries: 2 });
    const cards = [card("dur", "en-cours"), card("a", "idee")];
    for (let i = 0; i < 2; i++) { p.nextBatch(cards); p.observe(cards); }
    const snap = JSON.parse(JSON.stringify(p.snapshot()));
    const q = createPlanner({ batch: 1, tries: 2 });
    q.restore(snap);
    expect(q.nextBatch(cards).map((c) => c.id)).toEqual(["a"]);
    expect(q.attempt(["dur"])).toBe(p.attempt(["dur"]));
  });

  it("lots de 6 cartes: les plus avancees d'abord", () => {
    const p = createPlanner();
    const cards = Array.from({ length: 10 }, (_, i) => card(`i${i}`, "idee")).concat([card("p", "preuves"), card("e", "en-cours")]);
    const b = p.nextBatch(cards);
    expect(b).toHaveLength(6);
    expect(b.slice(0, 2).map((c) => c.id)).toEqual(["p", "e"]);
  });

  it("une carte qui n'avance pas apres 3 essais laisse la place aux autres (rotation), sans etre abandonnee", () => {
    const p = createPlanner({ batch: 1, tries: 3 });
    let cards = [card("dur", "en-cours"), card("a", "idee"), card("b", "idee")];
    for (let i = 0; i < 3; i++) { p.nextBatch(cards); p.observe(cards); }
    expect(p.nextBatch(cards).map((c) => c.id)).toEqual(["a"]);          // « dur » passe derriere
    cards = [card("dur", "en-cours"), card("a", "termine"), card("b", "termine")];
    p.observe(cards);
    expect(p.nextBatch(cards).map((c) => c.id)).toEqual(["dur"]);        // reprise quand il ne reste que lui
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
