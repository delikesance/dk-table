// @vitest-environment node
/** Preuves ecrites apres fusion (depot reel): commit identifiable, TODO coche, aucune verification supplementaire, echec propre. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseReport } from "./card";
import { createGitFlow, type Run } from "./git";
import { createProver } from "./proveCards";
import { gitEnv, isTest } from "./testUtil";

vi.setConfig({ testTimeout: 60_000 });
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const env = gitEnv();
const g = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", env }).trim();
const REPORT = "# Rapport : Tri\nVisible : non\n\n## Fait\n- tri\n\n## Non fait\n- aucun\n";

function setup() {
  const repo = mkdtempSync(join(tmpdir(), "prf-")); dirs.push(repo);
  g(repo, "init", "-q", "-b", "developpement");
  writeFileSync(join(repo, "TODO.md"), "# TODO\n- [ ] Tri\n"); writeFileSync(join(repo, "a.ts"), "a"); writeFileSync(join(repo, ".gitignore"), ".claude/\n");
  g(repo, "add", "-A"); g(repo, "commit", "-qm", "init");
  const tests: string[] = [];
  const run: Run = async (cmd, args, cwd) => {
    if (isTest(cmd, args)) { tests.push(cwd ?? ""); return { code: 0, out: " Tests  12 passed (12)\n" }; }
    if (cmd === "npm" || cmd === "npx") return { code: 0, out: "" };
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env });
    return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  return { repo, run, tests, flow: createGitFlow(run, repo) };
}
async function work(flow: ReturnType<typeof setup>["flow"], file: string, report?: string) {
  const w = await flow.startSector("implementation", "tri");
  writeFileSync(join(w.dir, file), file);
  if (report) { mkdirSync(join(w.dir, "docs", "rapports"), { recursive: true }); writeFileSync(join(w.dir, "docs", "rapports", "tri.md"), report); }
  await flow.commit(w.dir, "Boucle: implementation");
  return w;
}

describe("preuves ecrites apres fusion", () => {
  it("un commit « Boucle: preuves » identifiable ecrit le rapport, les resultats reels et coche TODO.md", async () => {
    const { repo, flow } = setup();
    const w = await work(flow, "b.ts", REPORT);
    const m = await flow.mergeIfGreen(w.branch, w.dir, { prove: createProver({ cwd: repo, cards: [{ id: "tri", title: "Tri" }] }) });
    expect(m.merged).toBe(true);
    expect(m.proofCommit).toMatch(/^[0-9a-f]+$/);
    expect(g(repo, "log", "-1", "--format=%s")).toBe("Boucle: preuves tri [boucle-proof]");
    const r = parseReport(readFileSync(join(repo, "docs", "rapports", "tri.md"), "utf8"));
    expect(r.status).toBe("termine");
    expect(r.proof).toMatchObject({ tests: { ok: true, count: 12 }, tsc: { ok: true } });
    expect(readFileSync(join(repo, "TODO.md"), "utf8")).toContain("- [x] Tri");
    expect(g(repo, "status", "--porcelain")).toBe("");
  });
  it("le commit de preuves ne relance aucune verification: la carte suivante qui le recoit par synchro n'execute pas la suite", async () => {
    const { repo, flow, tests } = setup();
    const a = await work(flow, "b.ts", REPORT);
    const b = await work(flow, "c.ts"); // cree avant la fusion de a: devra se synchroniser avec le commit de preuves
    await flow.mergeIfGreen(a.branch, a.dir, { prove: createProver({ cwd: repo, cards: [{ id: "tri", title: "Tri" }] }) });
    const before = tests.length;
    // developpement n'a avance que par la fusion de a (code) + preuves (docs): b apporte sa verification initiale, mais pas de relance apres synchro
    // (la fusion de a touche b.ts: ce n'est pas « meta » seule, donc une relance reste justifiee pour b)
    await flow.mergeIfGreen(b.branch, b.dir);
    expect(tests.length - before).toBeGreaterThanOrEqual(1);
    const c = await work(flow, "d.ts");
    const n = tests.length;
    await flow.mergeIfGreen(c.branch, c.dir); // aucun changement de developpement entre-temps: une seule suite
    expect(tests.length - n).toBe(1);
  });
  it("developpement avance seulement par des preuves: pas de relance apres synchro", async () => {
    const { repo, flow, tests } = setup();
    const b = await work(flow, "c.ts");
    // un commit de preuves arrive sur developpement pendant le travail de b
    mkdirSync(join(repo, "docs", "rapports"), { recursive: true });
    writeFileSync(join(repo, "docs", "rapports", "x.md"), "# Rapport : x\n");
    g(repo, "add", "-A"); g(repo, "commit", "-qm", "Boucle: preuves x [boucle-proof]");
    const m = await flow.mergeIfGreen(b.branch, b.dir);
    expect(m.merged).toBe(true);
    expect(tests).toHaveLength(1); // verification initiale seulement
  });
  it("ecriture des preuves en echec: arbre principal propre, fusion conservee, anomalie rapportee", async () => {
    const { repo, flow } = setup();
    const w = await work(flow, "b.ts", REPORT);
    const m = await flow.mergeIfGreen(w.branch, w.dir, { prove: async () => { writeFileSync(join(repo, "TODO.md"), "casse"); throw new Error("disque plein"); } });
    expect(m.merged).toBe(true);
    expect(m.proofError).toContain("disque plein");
    expect(g(repo, "status", "--porcelain")).toBe("");
  });
  it("reprove: preuves ecrites sans agent apres une suite complete verte sur le worktree de reference", async () => {
    const { repo, flow, tests } = setup();
    mkdirSync(join(repo, "docs", "rapports"), { recursive: true });
    writeFileSync(join(repo, "docs", "rapports", "tri.md"), REPORT);
    g(repo, "add", "-A"); g(repo, "commit", "-qm", "rapport sans preuves");
    const r = await flow.reprove(createProver({ cwd: repo, cards: [{ id: "tri", title: "Tri" }] }));
    expect(r.proved).toEqual(["tri"]);
    expect(tests).toHaveLength(1);
    expect(tests[0]).toContain("base-"); // jamais dans l'arbre principal de l'utilisateur
    expect(g(repo, "log", "-1", "--format=%s")).toBe("Boucle: preuves tri [boucle-proof]");
    expect(parseReport(readFileSync(join(repo, "docs", "rapports", "tri.md"), "utf8")).proof?.tests.ok).toBe(true);
    await flow.dispose();
  });
});
