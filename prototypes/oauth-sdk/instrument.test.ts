/** Instrumentation: commandes, appels modele, evenements et transitions de cartes vers le journal technique. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import { logEvent, trackBoard, wrapQuery, wrapRun } from "./instrument";
import { createLogs } from "./logger";
import { readRun } from "./logRead";
import type { QueryFn } from "./research";

const setup = () => { const dir = mkdtempSync(join(tmpdir(), "ins-")); const l = createLogs({ dir, env: { CLAUDE_CODE_OAUTH_TOKEN: "sk-ant-oat01-SECRETSECRET123" }, level: "debug" }).start(); return { dir, l, read: () => readRun(dir, l.run) }; };

describe("wrapRun", () => {
  it("journalise commande, repertoire, code, duree et sortie (sans ANSI ni secret); renvoie le resultat tel quel", async () => {
    const { l, read } = setup();
    const run = wrapRun(async () => ({ code: 1, out: "\u001b[31mECHEC\u001b[0m sk-ant-oat01-SECRETSECRET123" }), () => l);
    expect(await run("npm", ["test"], "/wt/a")).toEqual({ code: 1, out: "\u001b[31mECHEC\u001b[0m sk-ant-oat01-SECRETSECRET123" });
    const e = (await read()).find((x) => x.comp === "cmd")!;
    expect(e).toMatchObject({ level: "warn", cmd: "npm test", cwd: "/wt/a", code: 1 });
    expect(typeof e.durMs).toBe("number");
    expect(String(e.out)).toContain("ECHEC");
    expect(JSON.stringify(e)).not.toMatch(/SECRETSECRET|\u001b/);
  });
  it("une commande qui leve est journalisee en erreur puis relancee", async () => {
    const { l, read } = setup();
    const run = wrapRun(async () => { throw new Error("spawn ENOENT"); }, () => l);
    await expect(run("git", ["x"])).rejects.toThrow("ENOENT");
    expect((await read()).find((x) => x.level === "error")).toMatchObject({ comp: "cmd", cmd: "git x" });
  });
  it("git de lecture en echec: debug seulement (pas de bruit)", async () => {
    const { l, read } = setup();
    await wrapRun(async () => ({ code: 1, out: "" }), () => l)("git", ["rev-parse", "--verify", "x"]);
    expect((await read()).find((x) => x.comp === "cmd")!.level).toBe("debug");
  });
});
describe("wrapQuery", () => {
  const msgs = [{ type: "assistant" }, { type: "result", subtype: "success", total_cost_usd: 0.42, num_turns: 7, duration_ms: 900, result: "ok" }];
  const q: QueryFn = () => (async function* () { for (const m of msgs) yield m as never; })();
  it("laisse passer tous les messages et journalise modele, cout, tours, budget demande; jamais l'env", async () => {
    const { l, read } = setup();
    const out: unknown[] = [];
    for await (const m of wrapQuery(q, () => l)({ prompt: "Cartes a traiter\nsecret sk-ant-oat01-SECRETSECRET123", options: { model: "haiku", maxTurns: 40, maxBudgetUsd: 0.3, cwd: "/wt/a", env: { CLAUDE_CODE_OAUTH_TOKEN: "sk-ant-oat01-SECRETSECRET123" } } })) out.push(m);
    expect(out).toHaveLength(2);
    const e = (await read()).find((x) => x.comp === "modele" && x.costUsd !== undefined)!;
    expect(e).toMatchObject({ model: "haiku", costUsd: 0.42, turns: 7, maxTurns: 40, maxBudgetUsd: 0.3, subtype: "success", cwd: "/wt/a" });
    expect(JSON.stringify(await read())).not.toContain("SECRETSECRET");
  });
  it("exception du flux: erreur journalisee avec stack, relancee", async () => {
    const { l, read } = setup();
    const bad: QueryFn = () => (async function* () { yield { type: "assistant" } as never; throw new Error("reseau"); })();
    await expect((async () => { for await (const _ of wrapQuery(bad, () => l)({ prompt: "x", options: { model: "sonnet" } })) { /* consomme */ } })()).rejects.toThrow("reseau");
    const e = (await read()).find((x) => x.level === "error")!;
    expect(e).toMatchObject({ comp: "modele", model: "sonnet" });
    expect((e.err as { stack: string }).stack).toContain("reseau");
  });
});
describe("logEvent", () => {
  it("erreur -> error; refus de fusion / anomalie -> warn avec raison; carte -> debug avec id; agent et carte portes", async () => {
    const { l, read } = setup();
    logEvent(l, { type: "error", message: "agent a : boum", agent: "a" });
    logEvent(l, { type: "info", sector: "implementation", message: "non fusionne (npm test failed (introduit par la branche): x.test.ts)", agent: "a" });
    logEvent(l, { type: "info", message: "anomalie : test(s) deja rouge(s) sur developpement" });
    logEvent(l, { type: "card", sector: "implementation", cardId: "a", agent: "a" });
    logEvent(l, { type: "end", sector: "implementation", ok: true, costUsd: 0.5, elapsedS: 12, agent: "a" });
    const es = await read();
    expect(es.map((e) => e.level)).toEqual(["error", "warn", "warn", "debug", "info"]);
    expect(es[1]).toMatchObject({ comp: "implementation", agent: "a" });
    expect(es[1].reason).toContain("introduit par la branche");
    expect(es[3]).toMatchObject({ card: "a" });
    expect(es[4]).toMatchObject({ costUsd: 0.5, elapsedS: 12, ok: true });
  });
});
describe("trackBoard", () => {
  const C = (id: string, state: string, extra: object = {}) => ({ id, state, missing: [], anomalies: [], ...extra }) as unknown as BoardCard;
  it("journalise chaque changement d'etat avec cause, rien si inchange; anomalies nouvelles en warn", async () => {
    const { l, read } = setup();
    const prev = new Map<string, string>();
    trackBoard(l, prev, [C("a", "idee"), C("b", "idee")]);
    trackBoard(l, prev, [C("a", "en-cours"), C("b", "idee")]);
    trackBoard(l, prev, [C("a", "en-cours"), C("b", "preuves", { missing: ["captures"] })]);
    trackBoard(l, prev, [C("a", "idee", { anomalies: ["orpheline : rapport en cours sans agent actif"] }), C("b", "preuves", { missing: ["captures"] })]);
    const t = (await read()).filter((e) => e.msg === "transition");
    expect(t.map((e) => `${e.card}:${e.from ?? "-"}>${e.to}`)).toEqual(["a:->idee", "b:->idee", "a:idee>en-cours", "b:idee>preuves", "a:en-cours>idee"]);
    expect(t[3].cause).toContain("captures");
    expect(t[4]).toMatchObject({ level: "warn" });
    expect(String(t[4].cause)).toContain("orpheline");
  });
});
