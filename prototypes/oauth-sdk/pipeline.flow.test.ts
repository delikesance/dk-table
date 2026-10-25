/** Flux avec faux agents: validation par code (correction seulement si necessaire), routage de modeles avec repli, push apres fusion. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";
import { createFileStateStore } from "./runState";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const card = (id: string, state: BoardCard["state"], missing: string[] = []) =>
  ({ id, title: id, source: "s", status: "found", summary: "", state, reportPath: "", missing, anomalies: [] }) as BoardCard;

interface Opts { /** Etat persistant (retry, essais). */ state?: ReturnType<typeof createFileStateStore>; boards: BoardCard[][]; testsRed?: boolean; /** Meme test rouge sur developpement (base). */ baseRed?: boolean; remote?: boolean; push?: boolean }
function harness(o: Opts) {
  const calls: { model: string; prompt: string }[] = [];
  const gitCalls: string[] = [];
  const run: Run = async (cmd, args, cwd) => {
    const line = `${cmd} ${args.join(" ")}`;
    if (cmd === "git") gitCalls.push(line);
    if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
    if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f\n" };
    if (cmd === "git" && args[0] === "remote") return { code: o.remote === false ? 1 : 0, out: "" };
    if (cmd === "npm" && args[0] === "test") {
      const red = cwd?.includes("/base-") ? o.baseRed : o.testsRed;
      return { code: red ? 1 : 0, out: red ? " FAIL  infra.test.ts > git lent" : "" };
    }
    return { code: 0, out: "" };
  };
  const query: QueryFn = ({ prompt, options }) => {
    calls.push({ model: String(options.model), prompt });
    return (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 }; })();
  };
  let n = 0;
  const events: BoucleEvent[] = [];
  const p = createPipeline({
    query, run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, push: o.push, state: o.state,
    board: async () => o.boards[Math.min(n++, o.boards.length - 1)], watchReports: () => () => {},
  });
  const go = () => p({ budgetEur: 50, onEvent: (e) => events.push(e), signal: new AbortController().signal });
  const impl = () => calls.filter((c) => c.prompt.includes("Cartes a traiter"));
  const corr = () => calls.filter((c) => c.prompt.includes("Cartes dont le rapport declare termine") || c.prompt.includes("fusion a ete refusee"));
  return { go, calls, events, gitCalls, impl, corr };
}

describe("validation par code", () => {
  it("lot valide (cartes terminees, fusion verte): aucune correction, donc aucun appel modele", async () => {
    const h = harness({ boards: [[card("a", "idee")], [card("a", "termine")]] });
    await h.go();
    expect(h.impl()).toHaveLength(1);
    expect(h.corr()).toHaveLength(0);
    expect(h.events.some((e) => /correction ignoree/.test(e.message ?? ""))).toBe(true);
  });
  it("rapport declare termine sans preuve (etat preuves): correction ciblee avec la liste exacte des preuves manquantes", async () => {
    const h = harness({ boards: [[card("a", "idee")], [card("a", "preuves", ["capture absente : x.png"])], [card("a", "termine")]] });
    await h.go();
    expect(h.corr()).toHaveLength(1);
    expect(h.corr()[0].prompt).toContain("a (manque : capture absente : x.png)");
  });
  it("fusion refusee (tests rouges): aucune correction depuis developpement; la carte est reprise avec la raison et le numero d'essai", async () => {
    const state = createFileStateStore(join(mkdtempSync(join(tmpdir(), "pf-")), "state.json"));
    const h = harness({ boards: [[card("a", "idee")]], testsRed: true, state });
    await h.go();
    expect(h.corr()).toHaveLength(0);
    expect(h.impl()).toHaveLength(3); // borne dure: 3 essais
    expect(h.impl()[0].prompt).not.toContain("REPRISE");
    expect(h.impl()[1].prompt).toContain("REPRISE (essai 2 sur 3)");
    expect(h.impl()[1].prompt).toContain("infra.test.ts > git lent");
    expect(h.impl()[2].prompt).toContain("REPRISE (essai 3 sur 3)");
  });
  it("3 essais sans fusion: carte bloquee avec raison structuree, arret « blocked », aucun 4e agent", async () => {
    const state = createFileStateStore(join(mkdtempSync(join(tmpdir(), "pf-")), "state.json"));
    const board = async () => {
      const d = state.load().cards.a?.deferred;
      return [d ? { ...card("a", "bloque"), blockReason: d.reason } as BoardCard : card("a", "idee")];
    };
    const calls: string[] = [];
    const query: QueryFn = ({ prompt }) => { if (prompt.includes("Cartes a traiter")) calls.push(prompt); return (async function* () { yield { type: "result", subtype: "success", result: "-", total_cost_usd: 0.01 }; })(); };
    const run: Run = async (cmd, args) => {
      if (cmd === "git" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
      if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f\n" };
      if (cmd === "npm" && args[0] === "test") return { code: 1, out: " FAIL  x.test.ts > casse" };
      return { code: 0, out: "" };
    };
    const events: BoucleEvent[] = [];
    const r = await createPipeline({ query, run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, state, board, watchReports: () => () => {} })({ budgetEur: 50, onEvent: (e) => events.push(e), signal: new AbortController().signal });
    expect(calls).toHaveLength(3);
    expect(r).toMatchObject({ complete: false, reason: "blocked" });
    expect(state.load().cards.a).toMatchObject({ tries: 3, deferred: { kind: "max-tries" } });
    expect(state.load().cards.a.models).toHaveLength(3); // un modele enregistre par essai
    expect(events.some((e) => /cartes bloquees/.test(e.message ?? ""))).toBe(true);
  });
});

describe("echec preexistant sur la base", () => {
  it("test deja rouge sur developpement: la carte est fusionnee et l'anomalie est signalee dans le journal", async () => {
    const h = harness({ boards: [[card("a", "idee")], [card("a", "termine")]], testsRed: true, baseRed: true });
    await h.go();
    expect(h.corr()).toHaveLength(0);
    expect(h.events.some((e) => /anomalie/.test(e.message ?? "") && /infra\.test\.ts > git lent/.test(e.message ?? ""))).toBe(true);
    expect(h.events.some((e) => /fusionne dans developpement/.test(e.message ?? ""))).toBe(true);
  });
});

describe("routage des modeles", () => {
  it("premiere tentative sur haiku; chaque tournee sans progres monte d'un cran (haiku, sonnet, opus)", async () => {
    const h = harness({ boards: [[card("a", "idee")]] });
    await h.go();
    expect(h.impl().map((c) => c.model)).toEqual(["haiku", "sonnet", "opus"]);
  });
  it("BOUCLE_MODELS remplace la chaine d'implementation", async () => {
    const calls: string[] = [];
    const query: QueryFn = ({ prompt, options }) => { if (prompt.includes("Cartes a traiter")) calls.push(String(options.model)); return (async function* () { yield { type: "result", subtype: "success", result: "-", total_cost_usd: 0.01 }; })(); };
    const run: Run = async (cmd, args) => (cmd === "git" && args[1] === "--abbrev-ref" ? { code: 0, out: "developpement\n" } : { code: 0, out: "" });
    const p = createPipeline({ query, run, cwd: "/r", eurUsd: 1, writeFile: () => {}, env: { BOUCLE_MODELS: '{"implementation":["sonnet"]}' }, board: async () => [card("a", "idee")], watchReports: () => () => {} });
    await p({ budgetEur: 50, onEvent: () => {}, signal: new AbortController().signal });
    expect(calls[0]).toBe("sonnet");
  });
});

describe("push apres fusion validee", () => {
  it("push: true -> `git push origin developpement:developpement` et message au journal", async () => {
    const h = harness({ boards: [[card("a", "idee")], [card("a", "termine")]], push: true });
    await h.go();
    expect(h.gitCalls).toContain("git push origin developpement:developpement");
    expect(h.events.some((e) => /developpement pousse sur origin/.test(e.message ?? ""))).toBe(true);
  });
  it("par defaut aucun push; sans remote: message clair, pas d'erreur", async () => {
    const off = harness({ boards: [[card("a", "termine")]] });
    await off.go();
    expect(off.gitCalls.some((l) => l.startsWith("git push"))).toBe(false);
    const nr = harness({ boards: [[card("a", "idee")], [card("a", "termine")]], push: true, remote: false });
    await nr.go();
    expect(nr.events.some((e) => /push non effectue : pas de remote origin/.test(e.message ?? ""))).toBe(true);
  });
});
