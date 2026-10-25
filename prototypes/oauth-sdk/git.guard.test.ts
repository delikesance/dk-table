/** Garde de fusion: tolerance restreinte aux tests deja rouges sans lien, pas de push d'un etat non vert, etat pousse = etat verifie, une suite a la fois. */
import { describe, expect, it } from "vitest";
import { isTest } from "./testUtil";
import { createGitFlow, type Run } from "./git";

const FAIL = (f: string) => ` FAIL  ${f} > suite > cas\nAssertionError: x`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function harness(o: { fails?: string; changed?: string[]; tree?: (cwd?: string) => string }) {
  const calls: { cmd: string; args: string[]; cwd?: string }[] = [];
  let live = 0, peak = 0;
  const run: Run = async (cmd, args, cwd) => {
    calls.push({ cmd, args, cwd });
    if (isTest(cmd, args)) {
      peak = Math.max(peak, ++live); await sleep(3); live--;
      return { code: o.fails ? 1 : 0, out: o.fails ?? "" };
    }
    if (cmd === "npx") return { code: 0, out: "" };
    if (cmd === "git" && args[0] === "diff") return { code: 0, out: (o.changed ?? []).join("\n") };
    if (cmd === "git" && args[0] === "rev-list") return { code: 0, out: "1\n" };
    if (cmd === "git" && args[0] === "rev-parse") return { code: 0, out: args.some((a) => a.includes("^{tree}")) ? (o.tree?.(cwd) ?? "T1") + "\n" : "developpement\n" };
    return { code: 0, out: "" };
  };
  return { flow: createGitFlow(run, "/repo", { push: true }), calls, peak: () => peak };
}
const go = async (h: ReturnType<typeof harness>) => { const w = await h.flow.startSector("implementation", "c"); return h.flow.mergeIfGreen(w.branch, w.dir); };

describe("garde de fusion", () => {
  it("test deja rouge sur la base mais LIE aux fichiers modifies: fusion refusee", async () => {
    const h = harness({ fails: FAIL("src/ui/appDocs.test.ts"), changed: ["src/ui/appDocs.ts"] });
    const r = await go(h);
    expect(r.merged).toBe(false);
    expect(r.reason).toMatch(/lie|lié/);
    expect(r.reason).toContain("appDocs.test.ts");
  });
  it("deja rouge sur la base et SANS lien: fusion locale permise mais aucun push (suite non verte)", async () => {
    const h = harness({ fails: FAIL("src/ui/appSplit.test.ts"), changed: ["src/engine/x.ts"] });
    const r = await go(h);
    expect(r.merged).toBe(true);
    expect(r.preexisting).toHaveLength(1);
    expect(r.push).toMatchObject({ pushed: false });
    expect(r.push?.reason).toMatch(/non verte|rouge/);
    expect(h.calls.some((c) => c.cmd === "git" && c.args[0] === "push")).toBe(false);
  });
  it("tout vert: poussee normale", async () => {
    const h = harness({});
    const r = await go(h);
    expect(r.push).toEqual({ pushed: true });
  });
  it("arbre fusionne different de l'arbre verifie: fusion annulee (reset --keep), rien n'est pousse", async () => {
    let n = 0;
    const h = harness({ tree: () => `T${n++}` });
    const r = await go(h);
    expect(r.merged).toBe(false);
    expect(r.reason).toMatch(/arbre|verifi/);
    expect(h.calls.some((c) => c.args[0] === "reset" && c.args.includes("--keep"))).toBe(true);
    expect(h.calls.some((c) => c.args[0] === "push")).toBe(false);
  });
  it("deux cartes qui fusionnent en meme temps: jamais deux suites de tests simultanees", async () => {
    const h = harness({});
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => h.flow.startSector("implementation", "x")));
    await Promise.all([a, b, c].map((w) => h.flow.mergeIfGreen(w.branch, w.dir)));
    expect(h.peak()).toBe(1);
  });
});
