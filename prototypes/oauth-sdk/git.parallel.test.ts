// @vitest-environment node
/** Git en parallele (depot reel): worktrees distincts, fusions serialisees, synchro avec developpement, conflit detecte, TODO.md en union. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitFlow, type Run } from "./git";

// vrais processus git: des dizaines de ms sous Linux mais des secondes sous Windows quand toute la suite tourne en parallele
vi.setConfig({ testTimeout: 60_000 });
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const g = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", "-c", "gc.auto=0", "-c", "core.fsync=none", ...a], { cwd, encoding: "utf8" }).trim();

/** Depot avec `developpement` + .gitattributes (TODO.md en union), npm/npx simules (compteur d'appels de tests). */
function setup(red: () => boolean = () => false) {
  const repo = mkdtempSync(join(tmpdir(), "par-")); dirs.push(repo);
  g(repo, "init", "-q", "-b", "developpement");
  writeFileSync(join(repo, ".gitattributes"), "TODO.md merge=union\n");
  writeFileSync(join(repo, "TODO.md"), "# TODO\n"); writeFileSync(join(repo, "shared.ts"), "a\nb\nc\n");
  g(repo, "add", "-A"); g(repo, "commit", "-qm", "init");
  const tests: string[] = [];
  const run: Run = async (cmd, args, cwd) => {
    if (cmd === "npm" && args[0] === "test") { tests.push(cwd ?? ""); return { code: red() ? 1 : 0, out: "" }; }
    if (cmd === "npm" || cmd === "npx") return { code: 0, out: "" };
    const r = spawnSync(cmd, ["-c", "user.email=a@b", "-c", "user.name=a", ...args], { cwd, encoding: "utf8" });
    return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  return { repo, run, tests, flow: createGitFlow(run, repo) };
}
const edit = (dir: string, file: string, text: string) => writeFileSync(join(dir, file), text);

describe("worktrees en parallele", () => {
  it("deux startSector simultanes (meme milliseconde) donnent deux branches et dossiers distincts", async () => {
    const { flow } = setup();
    const [a, b] = await Promise.all([flow.startSector("implementation", "carte-a"), flow.startSector("implementation", "carte-a")]);
    expect(a.branch).not.toBe(b.branch);
    expect(a.dir).not.toBe(b.dir);
    expect(a.branch).toContain("carte-a");
  });
});

describe("fusions serialisees", () => {
  it("deux cartes independantes fusionnees en meme temps: historique lineaire, les deux presentes", async () => {
    const { repo, flow } = setup();
    const [a, b] = await Promise.all([flow.startSector("implementation", "a"), flow.startSector("implementation", "b")]);
    edit(a.dir, "a.ts", "A"); edit(b.dir, "b.ts", "B");
    await flow.commit(a.dir, "a"); await flow.commit(b.dir, "b");
    const [ra, rb] = await Promise.all([flow.mergeIfGreen(a.branch, a.dir), flow.mergeIfGreen(b.branch, b.dir)]);
    expect(ra.merged && rb.merged).toBe(true);
    expect(readFileSync(join(repo, "a.ts"), "utf8")).toBe("A");
    expect(readFileSync(join(repo, "b.ts"), "utf8")).toBe("B");
    expect(g(repo, "status", "--porcelain")).toBe("");
  });
  it("branche en retard sur developpement: synchronisee puis tests relances sur l'etat fusionne", async () => {
    const { repo, flow, tests } = setup();
    const [a, b] = await Promise.all([flow.startSector("implementation", "a"), flow.startSector("implementation", "b")]);
    edit(a.dir, "a.ts", "A"); edit(b.dir, "b.ts", "B");
    await flow.commit(a.dir, "a"); await flow.commit(b.dir, "b");
    await flow.mergeIfGreen(a.branch, a.dir);
    const before = tests.length;
    const rb = await flow.mergeIfGreen(b.branch, b.dir);
    expect(rb.merged).toBe(true);
    expect(tests.length - before).toBe(2); // tests avant verrou + tests apres synchro (developpement a avance)
    expect(g(repo, "log", "--format=%s", "developpement")).toMatch(/b/);
  });
  it("cartes qui modifient la meme ligne: la 2e est un conflit, developpement intact, worktree conserve", async () => {
    const { repo, flow } = setup();
    const [a, b] = await Promise.all([flow.startSector("implementation", "a"), flow.startSector("implementation", "b")]);
    edit(a.dir, "shared.ts", "a\nB1\nc\n"); edit(b.dir, "shared.ts", "a\nB2\nc\n");
    await flow.commit(a.dir, "a"); await flow.commit(b.dir, "b");
    expect((await flow.mergeIfGreen(a.branch, a.dir)).merged).toBe(true);
    const head = g(repo, "rev-parse", "developpement");
    const rb = await flow.mergeIfGreen(b.branch, b.dir);
    expect(rb).toMatchObject({ merged: false, conflict: true });
    expect(g(repo, "rev-parse", "developpement")).toBe(head);
    expect(g(b.dir, "status", "--porcelain")).toBe(""); // synchro annulee proprement
  });
  it("TODO.md modifie par deux cartes: fusion en union sans conflit", async () => {
    const { repo, flow } = setup();
    const [a, b] = await Promise.all([flow.startSector("implementation", "a"), flow.startSector("implementation", "b")]);
    edit(a.dir, "TODO.md", "# TODO\n- [x] A\n"); edit(b.dir, "TODO.md", "# TODO\n- [x] B\n");
    await flow.commit(a.dir, "a"); await flow.commit(b.dir, "b");
    await flow.mergeIfGreen(a.branch, a.dir);
    expect((await flow.mergeIfGreen(b.branch, b.dir)).merged).toBe(true);
    const todo = readFileSync(join(repo, "TODO.md"), "utf8");
    expect(todo).toContain("- [x] A"); expect(todo).toContain("- [x] B");
  });
  it("tests rouges apres synchro: pas de fusion, pas de conflit", async () => {
    let red = false;
    const { flow } = setup(() => red);
    const [a, b] = await Promise.all([flow.startSector("implementation", "a"), flow.startSector("implementation", "b")]);
    edit(a.dir, "a.ts", "A"); edit(b.dir, "b.ts", "B");
    await flow.commit(a.dir, "a"); await flow.commit(b.dir, "b");
    await flow.mergeIfGreen(a.branch, a.dir);
    const checks = flow.mergeIfGreen(b.branch, b.dir);
    red = true; // la synchro (developpement a avance) relance les tests: ils sont rouges
    const rb = await checks;
    expect(rb.merged).toBe(false);
    expect(rb.conflict).toBeFalsy();
  });
});
