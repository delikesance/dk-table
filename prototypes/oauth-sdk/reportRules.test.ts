/** Tests de la consigne de rapport donnee a l'agent d'implementation. */
import { describe, expect, it } from "vitest";
import { reportRules, MAX_BATCH, pickBatch } from "./reportRules";

const card = (id: string, state: string) => ({ id, title: `T ${id}`, source: `src ${id}`, state }) as never;

describe("reportRules", () => {
  it("liste les cartes avec id, rapport, preuves exigees, zero question et trancheur", () => {
    const t = reportRules([card("a", "idee"), card("b", "preuves")]);
    expect(t).toContain("docs/rapports/a.md");
    expect(t).toContain("T b");
    expect(t).toMatch(/N'ecris NI `Statut`/); // les preuves sont ecrites par le code
    expect(t).not.toMatch(/Tests : ok/);
    expect(t).toMatch(/test qui echoue/);
    expect(t).toMatch(/docs\/screenshots\/<id>/);
    expect(t).toMatch(/trancheur/);
    expect(t).toMatch(/jamais de question/i);
  });
  it("pickBatch: au plus MAX_BATCH cartes non terminees, en cours/preuves d'abord", () => {
    const cards = ["i1", "i2", "i3", "i4"].map((i) => card(i, "idee")).concat([card("p", "preuves"), card("d", "termine"), card("e", "en-cours")]);
    const b = pickBatch(cards);
    expect(b).toHaveLength(MAX_BATCH);
    expect(b.map((c) => c.id).slice(0, 2).sort()).toEqual(["e", "p"]);
    expect(b.some((c) => c.id === "d")).toBe(false);
  });
});
