/** Choix du lot : doublon, dependance, design, decoupe des cartes L. */
import { describe, expect, it } from "vitest";
import type { Qualification } from "./qualify";
import { selectBatch } from "./selectBatch";

const q = (id: string, o: Partial<Qualification> = {}): Qualification => ({ id, size: "S", files: [], criteria: [], dependsOn: [], decision: "implement", parts: [], ...o });
const cards = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));

describe("selectBatch", () => {
  it("chaque decision a son effet et sa raison structuree", () => {
    const v = new Map([
      ["a", q("a", { files: ["src/a.ts"], criteria: ["ok"] })], ["b", q("b", { decision: "reject_duplicate", duplicateOf: "a" })],
      ["c", q("c", { dependsOn: ["a"] })], ["d", q("d", { decision: "needs_design" })],
      ["e", q("e", { size: "L", decision: "split", parts: ["e1", "e2"] })], ["f", q("f", { size: "L" })],
    ]);
    const { selected, deferred } = selectBatch(cards, v, { designPending: true });
    expect(selected).toEqual([{ id: "a", files: ["src/a.ts"], criteria: ["ok"] }]);
    expect(Object.fromEntries(deferred.map((d) => [d.id, d.kind]))).toEqual({ b: "duplicate", c: "dependency", d: "needs-design", e: "split", f: "too-large" });
    expect(deferred.find((d) => d.id === "e")?.reason).toContain("e1 | e2");
  });
  it("une dependance deja terminee ne bloque pas; un doublon du code l'emporte", () => {
    const v = new Map([["a", q("a", { dependsOn: ["b"] })]]);
    expect(selectBatch([{ id: "a" }, { id: "b" }], v, { done: new Set(["b"]) }).selected.map((c) => c.id)).toEqual(["a", "b"]);
    expect(selectBatch([{ id: "a" }], v, { duplicates: new Map([["a", "doublon de X"]]) }).deferred[0]).toMatchObject({ kind: "duplicate", reason: "doublon de X" });
  });
  it("sans verdict la carte part (comportement d'avant)", () => {
    expect(selectBatch(cards, new Map()).selected).toHaveLength(6);
  });
});
