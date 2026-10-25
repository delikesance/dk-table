/** Planificateur des tournees : rotation des cartes bloquees, progres par etat, raisons d'arret claires. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import { createPlanner, stopMessage } from "./rounds";

const card = (id: string, state: BoardCard["state"]) => ({ id, title: id, source: "s", state }) as BoardCard;

describe("createPlanner", () => {
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
