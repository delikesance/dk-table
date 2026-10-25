/** Borne dure: 3 essais par carte, puis bloquee avec raison structuree. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_TRIES } from "./limits";
import { createFileStateStore } from "./runState";
import { enforceLimit } from "./tries";

const store = () => createFileStateStore(join(mkdtempSync(join(tmpdir(), "tr-")), "state.json"));

describe("enforceLimit", () => {
  it("la limite est de 3 essais", () => expect(MAX_TRIES).toBe(3));
  it("bloque une carte non terminee au 3e essai, avec raison et branche; les autres sont intactes", () => {
    const st = store();
    st.update((s) => { s.cards.a = { tries: 3, models: ["haiku", "sonnet", "opus"], lastReason: "tests rouges", branch: "wt/x" }; s.cards.b = { tries: 2, models: [] }; s.cards.c = { tries: 5, models: [] }; });
    const out = enforceLimit(st, [{ id: "a", state: "en-cours" }, { id: "b", state: "idee" }, { id: "c", state: "termine" }]);
    expect(out.map((o) => o.id)).toEqual(["a"]);
    expect(st.load().cards.a.deferred).toMatchObject({ kind: "max-tries" });
    expect(st.load().cards.a.deferred!.reason).toMatch(/3 essais.*tests rouges.*wt\/x/);
    expect(st.load().cards.b.deferred).toBeUndefined();
    expect(st.load().cards.c.deferred).toBeUndefined(); // terminee: jamais bloquee
  });
  it("idempotent: une carte deja bloquee n'est pas signalee deux fois", () => {
    const st = store();
    st.update((s) => { s.cards.a = { tries: 4, models: [] }; });
    expect(enforceLimit(st, [{ id: "a", state: "idee" }])).toHaveLength(1);
    expect(enforceLimit(st, [{ id: "a", state: "idee" }])).toHaveLength(0);
  });
});
