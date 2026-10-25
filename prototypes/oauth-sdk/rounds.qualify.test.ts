/** Qualification dans les tournees : cartes ecartees = bloquees avec raison, aucun agent pour elles. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import { runRounds } from "./rounds";
import { createFileStateStore } from "./runState";
import { selectBatch } from "./selectBatch";
import type { Qualification } from "./qualify";

const card = (id: string, state: BoardCard["state"] = "idee") => ({ id, title: id, source: "s", state }) as BoardCard;
const q = (id: string, o: Partial<Qualification> = {}): Qualification => ({ id, size: "S", files: [], criteria: [], dependsOn: [], decision: "implement", parts: [], ...o });

describe("runRounds: qualification", () => {
  it("la carte en doublon n'a aucun agent, elle est bloquee avec sa raison; l'autre est implementee avec ses fichiers", async () => {
    const st = createFileStateStore(join(mkdtempSync(join(tmpdir(), "rq-")), "state.json"));
    const done = new Set<string>();
    const board = async () => ["a", "b"].map((id) => {
      const d = st.load().cards[id]?.deferred;
      return done.has(id) ? card(id, "termine") : d ? ({ ...card(id, "bloque"), blockReason: d.reason } as BoardCard) : card(id);
    });
    const seen: { ids: string[]; files?: string[] }[] = [];
    const verdicts = new Map([["a", q("a", { files: ["src/a.ts"] })], ["b", q("b", { decision: "reject_duplicate", duplicateOf: "a" })]]);
    const r = await runRounds({
      board, state: st, emit: () => {}, halt: () => null, progress: () => {}, corr: async () => true,
      qualify: async (batch) => selectBatch(batch, verdicts),
      impl: async (_t, _a, cs) => { seen.push({ ids: cs.map((c) => c.id), files: cs[0].files }); cs.forEach((c) => done.add(c.id)); return { merged: true }; },
    });
    expect(seen).toEqual([{ ids: ["a"], files: ["src/a.ts"] }]);
    expect(st.load().cards.b.deferred).toMatchObject({ kind: "duplicate" });
    expect(r.reason).toBe("blocked");
  });
  it("tout le lot ecarte: aucune implementation, la tournee suivante continue (pas d'arret « stuck »)", async () => {
    const st = createFileStateStore(join(mkdtempSync(join(tmpdir(), "rq-")), "state.json"));
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const board = async () => ids.map((id) => { const d = st.load().cards[id]?.deferred; return d ? ({ ...card(id, "bloque"), blockReason: d.reason } as BoardCard) : card(id); });
    let impl = 0;
    const r = await runRounds({
      board, state: st, emit: () => {}, halt: () => null, progress: () => {}, corr: async () => true,
      qualify: async (batch) => selectBatch(batch, new Map(batch.map((b) => [b.id, q(b.id, { decision: "reject_duplicate" })]))),
      impl: async () => { impl++; return { merged: true }; },
    });
    expect(impl).toBe(0);
    expect(r.reason).toBe("blocked");
    expect(ids.every((id) => st.load().cards[id].deferred?.kind === "duplicate")).toBe(true);
  });
});
