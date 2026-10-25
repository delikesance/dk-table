import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStateStore, emptyState, parseState, STATE_VERSION } from "./runState";

const tmp = () => mkdtempSync(join(tmpdir(), "boucle-state-"));

describe("parseState", () => {
  it("accepte un etat valide et ecarte les champs mal formes", () => {
    const s = parseState({ version: STATE_VERSION, runId: "r1", cards: { a: { tries: 2, models: ["haiku"], lastReason: "x" }, b: { tries: "oops" }, c: 3 }, avoid: ["a", 4], planner: { fails: { a: 1, b: "x" }, seen: { a: 2 }, idle: 1, rounds: 4 }, budget: { spentUsd: 1.5, reservedUsd: 9 } });
    expect(s?.cards.a).toMatchObject({ tries: 2, models: ["haiku"], lastReason: "x" });
    expect(s?.cards.b).toBeUndefined();
    expect(s?.cards.c).toBeUndefined();
    expect(s?.avoid).toEqual(["a"]);
    expect(s?.planner).toEqual({ fails: { a: 1 }, seen: { a: 2 }, idle: 1, rounds: 4 });
    expect(s?.budget).toEqual({ spentUsd: 1.5, reservedUsd: 0 }); // les reservations en vol ne survivent pas a un crash
  });
  it("finished: vrai par defaut, faux seulement s'il est ecrit faux (run interrompu)", () => {
    expect(parseState({ version: STATE_VERSION, runId: "r" })?.finished).toBe(true);
    expect(parseState({ version: STATE_VERSION, runId: "r", finished: false })?.finished).toBe(false);
  });
  it("refuse une autre version ou une forme inattendue", () => {
    expect(parseState({ version: STATE_VERSION + 1, runId: "r" })).toBeNull();
    expect(parseState("x")).toBeNull();
    expect(parseState(null)).toBeNull();
  });
});

describe("createFileStateStore", () => {
  it("fichier absent: etat vide sans avertissement", () => {
    const warns: string[] = [];
    const st = createFileStateStore(join(tmp(), "state.json"), { onWarn: (m) => warns.push(m) });
    expect(st.load()).toEqual(emptyState(""));
    expect(warns).toEqual([]);
  });
  it("ecriture atomique: aller-retour, aucun fichier temporaire laisse", () => {
    const dir = tmp(), file = join(dir, "state.json");
    const st = createFileStateStore(file);
    st.update((s) => { s.runId = "r9"; s.cards.a = { tries: 1, models: ["haiku"] }; s.avoid.push("a"); });
    expect(createFileStateStore(file).load()).toMatchObject({ runId: "r9", cards: { a: { tries: 1 } }, avoid: ["a"] });
    expect(readdirSync(dir)).toEqual(["state.json"]);
    expect(JSON.parse(readFileSync(file, "utf-8")).version).toBe(STATE_VERSION);
  });
  it("fichier corrompu: ignore, journalise, copie conservee, etat sur", () => {
    const dir = tmp(), file = join(dir, "state.json"), warns: string[] = [];
    writeFileSync(file, "{ pas du json");
    const st = createFileStateStore(file, { onWarn: (m) => warns.push(m) });
    expect(st.load()).toEqual(emptyState(""));
    expect(warns).toHaveLength(1);
    expect(readdirSync(dir).some((f) => f.startsWith("state.json.corrupt"))).toBe(true);
    st.update((s) => { s.runId = "ok"; }); // le run repart et reecrit un fichier sain
    expect(createFileStateStore(file).load().runId).toBe("ok");
  });
  it("version inconnue: traitee comme corrompue", () => {
    const dir = tmp(), file = join(dir, "state.json"), warns: string[] = [];
    writeFileSync(file, JSON.stringify({ version: 99, runId: "x" }));
    expect(createFileStateStore(file, { onWarn: (m) => warns.push(m) }).load()).toEqual(emptyState(""));
    expect(warns).toHaveLength(1);
  });
  it("une erreur d'ecriture ne leve jamais", () => {
    const warns: string[] = [];
    const st = createFileStateStore(join(tmp(), "n'existe", "pas", "\0state.json"), { onWarn: (m) => warns.push(m) });
    expect(() => st.update((s) => { s.runId = "x"; })).not.toThrow();
    expect(warns.length).toBeGreaterThan(0);
  });
});
