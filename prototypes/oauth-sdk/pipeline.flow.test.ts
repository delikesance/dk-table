/** Flux avec faux agents: validation par code (correction seulement si necessaire), routage de modeles avec repli, push apres fusion. */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

const card = (id: string, state: BoardCard["state"], missing: string[] = []) =>
  ({ id, title: id, source: "s", status: "found", summary: "", state, reportPath: "", missing, anomalies: [] }) as BoardCard;

interface Opts { boards: BoardCard[][]; testsRed?: boolean; remote?: boolean; push?: boolean }
function harness(o: Opts) {
  const calls: { model: string; prompt: string }[] = [];
  const gitCalls: string[] = [];
  const run: Run = async (cmd, args) => {
    const line = `${cmd} ${args.join(" ")}`;
    if (cmd === "git") gitCalls.push(line);
    if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
    if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f\n" };
    if (cmd === "git" && args[0] === "remote") return { code: o.remote === false ? 1 : 0, out: "" };
    if (cmd === "npm" && args[0] === "test") return { code: o.testsRed ? 1 : 0, out: o.testsRed ? "FAIL x" : "" };
    return { code: 0, out: "" };
  };
  const query: QueryFn = ({ prompt, options }) => {
    calls.push({ model: String(options.model), prompt });
    return (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 }; })();
  };
  let n = 0;
  const events: BoucleEvent[] = [];
  const p = createPipeline({
    query, run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, push: o.push,
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
  it("fusion refusee (tests rouges): correction lancee avec la raison", async () => {
    const h = harness({ boards: [[card("a", "idee")], [card("a", "idee")]], testsRed: true });
    await h.go();
    expect(h.corr().length).toBeGreaterThan(0);
    expect(h.corr()[0].prompt).toContain("fusion a ete refusee");
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
