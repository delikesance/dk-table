// @vitest-environment node
/** Fin de lot (depots reels): une suite complete par lot, push seulement si verte, reprise des fusions locales non poussees. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitFlow, type Run } from "./git";
import { gitEnv, isTest } from "./testUtil";

vi.setConfig({ testTimeout: 60_000 });
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const env = gitEnv();
const g = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", env }).trim();

/** Distant bare + depot de travail sur developpement; npm/npx simules (journal des commandes de tests). */
function setup() {
  const root = mkdtempSync(join(tmpdir(), "bat-")); dirs.push(root);
  const remote = join(root, "remote.git"), repo = join(root, "w");
  g(root, "init", "-q", "--bare", "-b", "developpement", remote);
  g(root, "clone", "-q", remote, repo);
  writeFileSync(join(repo, ".gitignore"), ".claude/\n"); writeFileSync(join(repo, "a.ts"), "a");
  g(repo, "add", "-A"); g(repo, "commit", "-qm", "init"); g(repo, "branch", "-M", "developpement"); g(repo, "push", "-q", "-u", "origin", "developpement");
  const cmds: { cmd: string; args: string[]; cwd?: string }[] = [];
  let suiteRed = false;
  const run: Run = async (cmd, args, cwd) => {
    if (cmd === "npm" || cmd === "npx") cmds.push({ cmd, args, cwd });
    if (cmd === "npm" && args[0] === "test") return { code: suiteRed ? 1 : 0, out: suiteRed ? " FAIL  lot.test.ts > rouge\n" : " Tests  20 passed (20)\n" };
    if (cmd === "npm" || cmd === "npx") return { code: 0, out: isTest(cmd, args) ? " Tests  3 passed (3)\n" : "" };
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env });
    return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  return { repo, remote, run, cmds, red: (v: boolean) => { suiteRed = v; }, flow: () => createGitFlow(run, repo, { push: true, pushAt: "batch" }) };
}
async function card(flow: ReturnType<ReturnType<typeof setup>["flow"]>, repo: string, file: string) {
  const w = await flow.startSector("implementation", file);
  writeFileSync(join(w.dir, file), file);
  await flow.commit(w.dir, `carte ${file}`);
  return w;
}
const fullSuites = (cmds: { cmd: string; args: string[] }[]) => cmds.filter((c) => c.cmd === "npm" && c.args[0] === "test" && c.args.length === 1);

describe("fin de lot", () => {
  it("trois cartes: tests lies par carte, UNE suite complete pour le lot, push seulement apres elle", async () => {
    const { repo, remote, cmds, flow: mk } = setup(); const flow = mk();
    const before = g(remote, "rev-parse", "developpement");
    for (const f of ["b.ts", "c.ts", "d.ts"]) {
      const w = await card(flow, repo, f);
      const m = await flow.mergeIfGreen(w.branch, w.dir);
      expect(m.merged).toBe(true);
      expect(m.push).toBeUndefined(); // pas de push par fusion
      expect(g(remote, "rev-parse", "developpement")).toBe(before);
    }
    expect(fullSuites(cmds)).toHaveLength(0); // par carte: seulement `vitest related`
    expect(cmds.filter((c) => c.args[0] === "vitest" && c.args[1] === "related").length).toBeGreaterThanOrEqual(3);
    const r = await flow.finishBatch();
    expect(r).toMatchObject({ verified: true, pushed: true, unpushed: 0 });
    expect(fullSuites(cmds)).toHaveLength(1);
    expect(fullSuites(cmds)[0].cwd).toContain("base-"); // worktree de reference, pas l'arbre de l'utilisateur
    expect(g(remote, "rev-parse", "developpement")).toBe(g(repo, "rev-parse", "developpement"));
    await flow.dispose();
  });
  it("suite complete rouge: aucun push, resultat non verifie avec la raison", async () => {
    const { repo, remote, red, flow: mk } = setup(); const flow = mk();
    const before = g(remote, "rev-parse", "developpement");
    const w = await card(flow, repo, "b.ts");
    await flow.mergeIfGreen(w.branch, w.dir);
    red(true);
    const r = await flow.finishBatch();
    expect(r.verified).toBe(false);
    expect(r.pushed).toBe(false);
    expect(r.reason).toContain("lot.test.ts > rouge");
    expect(g(remote, "rev-parse", "developpement")).toBe(before);
    await flow.dispose();
  });
  it("rien de neuf depuis la derniere verification: ignore (aucune suite relancee)", async () => {
    const { repo, cmds, flow: mk } = setup(); const flow = mk();
    const w = await card(flow, repo, "b.ts");
    await flow.mergeIfGreen(w.branch, w.dir);
    await flow.finishBatch();
    const n = fullSuites(cmds).length;
    expect(await flow.finishBatch()).toMatchObject({ skipped: true });
    expect(fullSuites(cmds)).toHaveLength(n);
    await flow.dispose();
  });
  it("reprise: fusions locales non poussees d'un run interrompu -> suite complete sur l'etat courant, push seulement si verte", async () => {
    const { repo, remote, cmds, red, flow: mk } = setup();
    // run precedent: fusions faites, jamais poussees (crash avant la fin du lot)
    const first = mk();
    const w = await card(first, repo, "b.ts");
    await first.mergeIfGreen(w.branch, w.dir);
    await first.dispose();
    const before = g(remote, "rev-parse", "developpement");
    // nouveau run (nouveau flux, drapeau interne a faux) : les commits non pousses sont detectes
    const second = mk();
    const n = await second.unpushed();
    expect(n).toBeGreaterThan(0); // commit de carte + commit de fusion
    cmds.length = 0; red(true);
    expect(await second.finishBatch(true)).toMatchObject({ verified: false, pushed: false, unpushed: n });
    expect(g(remote, "rev-parse", "developpement")).toBe(before);
    red(false);
    expect(await second.finishBatch(true)).toMatchObject({ verified: true, pushed: true, unpushed: 0 });
    expect(fullSuites(cmds)).toHaveLength(2); // une suite complete a chaque tentative, jamais de push sans elle
    expect(g(remote, "rev-parse", "developpement")).toBe(g(repo, "rev-parse", "developpement"));
    await second.dispose();
  });
  it("developpement avance pendant la verification: push retenu", async () => {
    const { repo, remote, run, flow: mk } = setup();
    let advanced = false;
    const racing: Run = async (cmd, args, cwd) => {
      if (cmd === "npm" && args[0] === "test" && !advanced) { advanced = true; writeFileSync(join(repo, "z.ts"), "z"); g(repo, "add", "-A"); g(repo, "commit", "-qm", "intrus"); }
      return run(cmd, args, cwd);
    };
    const flow = createGitFlow(racing, repo, { push: true, pushAt: "batch" }); void mk;
    const w = await card(flow, repo, "b.ts");
    await flow.mergeIfGreen(w.branch, w.dir);
    const before = g(remote, "rev-parse", "developpement");
    const r = await flow.finishBatch(true);
    expect(r).toMatchObject({ verified: false, pushed: false });
    expect(r.reason).toMatch(/avance pendant la verification/);
    expect(g(remote, "rev-parse", "developpement")).toBe(before);
    await flow.dispose();
  });
});
