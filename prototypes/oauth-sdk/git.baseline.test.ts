/** Verification avant fusion avec reference a la base : un test deja rouge sur developpement ne bloque pas la carte. */
import { describe, expect, it } from "vitest";
import { createGitFlow, type Run } from "./git";

const FAIL_A = " FAIL  prototypes/oauth-sdk/git.push.test.ts > pushDev > distant en avance\nError: Test timed out in 5000ms.\n Tests  1 failed | 2016 passed";
const FAIL_B = " FAIL  src/engine/sheet.test.ts > setCell > recalcule\nAssertionError: x";

/** Run factice: git/npm ci ok; `npm test` en branche et sur la base renvoient les sorties donnees; tsc configurable. */
function harness(o: { branch: string; base?: string; tsc?: number }) {
  const calls: { cmd: string; args: string[]; cwd?: string }[] = [];
  const run: Run = async (cmd, args, cwd) => {
    calls.push({ cmd, args, cwd });
    if (cmd === "npm" && args[0] === "test") {
      const out = cwd?.includes("/base-") ? (o.base ?? "") : o.branch;
      return { code: out ? 1 : 0, out };
    }
    if (cmd === "npx") return { code: o.tsc ?? 0, out: o.tsc ? "error TS2322: x" : "" };
    if (cmd === "git" && args[0] === "rev-list") return { code: 0, out: "1\n" };
    if (cmd === "git" && args[0] === "rev-parse") return { code: 0, out: "developpement\n" };
    return { code: 0, out: "" };
  };
  const flow = createGitFlow(run, "/repo");
  const baseRuns = () => calls.filter((c) => c.cmd === "npm" && c.args[0] === "test" && c.cwd?.includes("/base-"));
  return { flow, calls, baseRuns };
}
const go = async (h: ReturnType<typeof harness>) => { const w = await h.flow.startSector("implementation", "c"); return h.flow.mergeIfGreen(w.branch, w.dir); };

describe("echec preexistant sur la base", () => {
  it("meme test rouge sur developpement: fusion autorisee, test signale (preexisting), seul le fichier concerne est relance sur la base", async () => {
    const h = harness({ branch: FAIL_A, base: FAIL_A });
    const r = await go(h);
    expect(r.merged).toBe(true);
    expect(r.preexisting).toEqual(["prototypes/oauth-sdk/git.push.test.ts > pushDev > distant en avance"]);
    expect(h.baseRuns()).toHaveLength(1);
    expect(h.baseRuns()[0].args).toEqual(["test", "--", "prototypes/oauth-sdk/git.push.test.ts"]);
  });
  it("test rouge sur la branche seulement: fusion refusee, raison = tests introduits", async () => {
    const h = harness({ branch: FAIL_A + "\n" + FAIL_B, base: FAIL_A });
    const r = await go(h);
    expect(r.merged).toBe(false);
    expect(r.reason).toContain("src/engine/sheet.test.ts > setCell > recalcule");
    expect(r.reason).toContain("introduit par la branche");
  });
  it("sortie illisible (crash, aucune ligne FAIL): fusion refusee, base non consultee", async () => {
    const h = harness({ branch: "Segmentation fault" });
    expect((await go(h)).merged).toBe(false);
    expect(h.baseRuns()).toHaveLength(0);
  });
  it("tsc rouge: fusion refusee meme si les tests rouges sont preexistants", async () => {
    const h = harness({ branch: FAIL_A, base: FAIL_A, tsc: 1 });
    const r = await go(h);
    expect(r.merged).toBe(false);
    expect(r.reason).toContain("tsc");
  });
  it("tout est vert: la base n'est jamais consultee", async () => {
    const h = harness({ branch: "" });
    const r = await go(h);
    expect(r).toMatchObject({ merged: true });
    expect(r.preexisting).toBeUndefined();
    expect(h.baseRuns()).toHaveLength(0);
  });
  it("le worktree de base est cree une fois et reutilise", async () => {
    const h = harness({ branch: FAIL_A, base: FAIL_A });
    await go(h); await go(h);
    const adds = h.calls.filter((c) => c.cmd === "git" && c.args[0] === "worktree" && c.args.includes("--detach"));
    expect(adds).toHaveLength(1);
    expect(h.baseRuns()).toHaveLength(2);
  });
});
