/** Qualification d'un lot : validation manuelle de la reponse, repli, cache, un seul appel. */
import { describe, expect, it, vi } from "vitest";
import { cacheKey, parseQualifications, qualifyCards, type Qualification } from "./qualify";

const cards = [{ id: "a", title: "A", summary: "sa", source: "" }, { id: "b", title: "B", summary: "sb", source: "" }];
const good = { cards: [{ id: "a", size: "S", decision: "implement", files: ["src/a.ts"], criteria: ["c1"] }, { id: "b", size: "L", decision: "split", parts: ["b1", "b2"] }] };

describe("qualify", () => {
  it("parse un objet, un texte avec bruit ou un bloc json; ignore les entrees invalides", () => {
    expect(parseQualifications(good, ["a", "b"]).size).toBe(2);
    expect(parseQualifications("voici:\n```json\n" + JSON.stringify(good) + "\n```", ["a", "b"]).get("b")?.parts).toEqual(["b1", "b2"]);
    const bad = { cards: [{ id: "zzz", size: "S", decision: "implement" }, { id: "a", size: "XL", decision: "implement" }, { id: "b", size: "M", decision: "boom" }, null, 3] };
    expect(parseQualifications(bad, ["a", "b"]).size).toBe(0);
    expect(parseQualifications("pas du json", ["a"]).size).toBe(0);
  });
  it("une dependance sur soi-meme est ignoree", () => {
    const q = parseQualifications({ cards: [{ id: "a", size: "S", decision: "implement", dependsOn: ["a", "b"] }] }, ["a", "b"]).get("a")!;
    expect(q.dependsOn).toEqual(["b"]);
  });
  it("un seul appel pour le lot; le cache evite le second", async () => {
    const ask = vi.fn(async () => good);
    const store = new Map<string, Qualification>();
    const cache = { get: (k: string) => store.get(k), set: (k: string, q: Qualification) => void store.set(k, q) };
    const r = await qualifyCards(cards, { ask, cache });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(r.get("a")?.files).toEqual(["src/a.ts"]);
    await qualifyCards(cards, { ask, cache });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(store.has(cacheKey(cards[0]))).toBe(true);
  });
  it("appel en echec, reponse invalide ou partielle : implement / M pour les cartes manquantes (comportement d'avant)", async () => {
    for (const ask of [async () => { throw new Error("x"); }, async () => null, async () => ({ cards: [good.cards[0]] })]) {
      const r = await qualifyCards(cards, { ask });
      expect(r.size).toBe(2);
      expect(r.get("b")).toMatchObject({ decision: "implement", size: "M" });
    }
  });
});
