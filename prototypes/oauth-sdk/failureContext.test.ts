/** Contexte d'echec et reprise: consigne bornee, essai n/3, tests rouges, fichiers; etat memorise puis efface a la fusion. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { failureOf, MAX_RETRY_CHARS, retryPrompt } from "./failureContext";
import { planRetry, recordAttempt } from "./retry";
import { createFileStateStore } from "./runState";

const store = () => createFileStateStore(join(mkdtempSync(join(tmpdir(), "fc-")), "state.json"));

describe("retryPrompt", () => {
  it("numero d'essai, nature, tests rouges, raison, fichiers et conduite a tenir", () => {
    const f = failureOf({ kind: "tests", reason: "npm test failed: FAIL a.test.ts > x", failed: ["a.test.ts > x"] }, ["src/a.ts"], 0);
    const t = retryPrompt(f, ["tri"], 1, 3);
    expect(t).toContain("essai 2 sur 3");
    expect(t).toContain("tests rouges");
    expect(t).toContain("- a.test.ts > x");
    expect(t).toContain("- src/a.ts");
    expect(t).toMatch(/jamais en affaiblissant/);
    expect(t).toMatch(/`## Non fait`[^\n]*cette carte[^\n]*`## Decisions`/);
  });
  it("borne: une sortie enorme ne depasse pas la taille maximale", () => {
    const t = retryPrompt(failureOf({ reason: "x".repeat(50_000), failed: Array(100).fill("t") }, Array(100).fill("f.ts"), 1), ["a"], 2, 3);
    expect(t.length).toBeLessThanOrEqual(MAX_RETRY_CHARS);
  });
});

describe("recordAttempt / planRetry", () => {
  const flow = { resumeSector: async (branch: string, dir: string) => ({ branch, dir }) };
  it("refus: essai compte, branche, session et echec memorises; reprise planifiee avec session et consigne", async () => {
    const st = store();
    recordAttempt(st, { cards: [{ id: "a" }], models: ["haiku"], merged: false, refusal: { kind: "tests", reason: "rouge", failed: ["x"] }, kept: { branch: "wt/a", dir: "/d" }, changed: ["f.ts"], session: { id: "s1", costUsd: 0.5 } });
    expect(st.load().cards.a).toMatchObject({ tries: 1, models: ["haiku"], branch: "wt/a", dir: "/d", sessionId: "s1", sessionCostUsd: 0.5, lastReason: "rouge" });
    const plan = await planRetry(st, flow, [{ id: "a" }, { id: "b" }]);
    expect(plan.reuse).toEqual({ branch: "wt/a", dir: "/d" });
    expect(plan.resume).toEqual({ sessionId: "s1", costUsd: 0.5 });
    expect(plan.prompt).toContain("essai 2 sur 3");
  });
  it("fusion reussie: branche, session et echec effaces, le compteur d'essais reste", async () => {
    const st = store();
    recordAttempt(st, { cards: [{ id: "a" }], models: ["haiku"], merged: false, refusal: { reason: "r" }, kept: { branch: "wt/a", dir: "/d" }, session: { id: "s1" } });
    recordAttempt(st, { cards: [{ id: "a" }], models: ["sonnet"], merged: true });
    expect(st.load().cards.a).toMatchObject({ tries: 2, models: ["haiku", "sonnet"] });
    expect(st.load().cards.a.branch).toBeUndefined();
    expect((await planRetry(st, flow, [{ id: "a" }])).reuse).toBeUndefined();
  });
  it("branche disparue (resumeSector null): nouveau worktree; carte bloquee: jamais reprise; sans etat: aucun effet", async () => {
    const st = store();
    recordAttempt(st, { cards: [{ id: "a" }], models: [], merged: false, refusal: {}, kept: { branch: "wt/a", dir: "/d" } });
    expect((await planRetry(st, { resumeSector: async () => null }, [{ id: "a" }])).reuse).toBeUndefined();
    st.update((s) => { s.cards.a.deferred = { kind: "max-tries", reason: "x" }; });
    expect((await planRetry(st, flow, [{ id: "a" }])).reuse).toBeUndefined();
    expect(await planRetry(undefined, flow, [{ id: "a" }])).toEqual({ skipped: [] });
  });
  it("deux cartes avec des branches differentes: une seule reprise, l'autre branche est signalee et conservee", async () => {
    const st = store();
    recordAttempt(st, { cards: [{ id: "a" }], models: [], merged: false, refusal: {}, kept: { branch: "wt/a", dir: "/da" } });
    recordAttempt(st, { cards: [{ id: "b" }], models: [], merged: false, refusal: {}, kept: { branch: "wt/b", dir: "/db" } });
    recordAttempt(st, { cards: [{ id: "b" }], models: [], merged: false, refusal: {}, kept: { branch: "wt/b", dir: "/db" } });
    const plan = await planRetry(st, flow, [{ id: "a" }, { id: "b" }]);
    expect(plan.reuse?.branch).toBe("wt/b"); // la plus avancee en essais
    expect(plan.skipped).toEqual(["wt/a"]);
  });
});
