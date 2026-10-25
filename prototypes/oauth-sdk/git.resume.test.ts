// @vitest-environment node
/** Reprise d'une branche refusee (depot reel): le worktree et la branche survivent, le code fautif y est, recreation si le dossier a disparu. */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitFlow, type Run } from "./git";
import { gitEnv } from "./testUtil";

vi.setConfig({ testTimeout: 60_000 });
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const env = gitEnv();
const g = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", env }).trim();

function setup() {
  const repo = mkdtempSync(join(tmpdir(), "res-")); dirs.push(repo);
  g(repo, "init", "-q", "-b", "developpement");
  writeFileSync(join(repo, ".gitignore"), ".claude/\n"); writeFileSync(join(repo, "a.ts"), "a");
  g(repo, "add", "-A"); g(repo, "commit", "-qm", "init");
  const ci: string[] = [];
  let red = true;
  const run: Run = async (cmd, args, cwd) => {
    if (cmd === "npm" && args[0] === "ci") { ci.push(cwd ?? ""); return { code: 0, out: "" }; }
    if (cmd === "npm" && args[0] === "test") return { code: red ? 1 : 0, out: red ? " FAIL  b.test.ts > casse\n" : "" };
    if (cmd === "npm" || cmd === "npx") return { code: 0, out: "" };
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env });
    return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  return { repo, flow: createGitFlow(run, repo), ci, fix: () => { red = false; } };
}

describe("resumeSector", () => {
  it("refus de fusion: le worktree n'est pas supprime; l'essai suivant le rouvre avec le code fautif, puis fusionne une fois corrige", async () => {
    const { repo, flow, ci, fix } = setup();
    const w = await flow.startSector("implementation", "tri");
    writeFileSync(join(w.dir, "b.ts"), "fautif");
    await flow.commit(w.dir, "Boucle: implementation");
    const m = await flow.mergeIfGreen(w.branch, w.dir);
    expect(m).toMatchObject({ merged: false, kind: "tests", failed: ["b.test.ts > casse"] });
    expect(existsSync(join(w.dir, "b.ts"))).toBe(true); // mergeIfGreen ne retire rien d'un refus
    const again = await flow.resumeSector(w.branch, w.dir);
    expect(again).toEqual({ branch: w.branch, dir: w.dir });
    expect(readFileSync(join(again!.dir, "b.ts"), "utf8")).toBe("fautif");
    expect(ci.filter((d) => d === w.dir)).toHaveLength(1); // dossier conserve: pas de second npm ci (l'autre ci = worktree de reference)
    fix();
    writeFileSync(join(again!.dir, "b.ts"), "corrige");
    await flow.commit(again!.dir, "Boucle: implementation");
    expect((await flow.mergeIfGreen(again!.branch, again!.dir)).merged).toBe(true);
    expect(readFileSync(join(repo, "b.ts"), "utf8")).toBe("corrige");
    await flow.dispose();
  });
  it("dossier disparu: worktree recree sur la meme branche (travail intact), npm ci relance", async () => {
    const { repo, flow, ci } = setup();
    const w = await flow.startSector("implementation", "tri");
    writeFileSync(join(w.dir, "b.ts"), "fautif");
    await flow.commit(w.dir, "Boucle: implementation");
    await flow.release(w.branch, w.dir); // retire le dossier; la branche garde le travail
    expect(existsSync(w.dir)).toBe(false);
    const again = await flow.resumeSector(w.branch, w.dir);
    expect(again).not.toBeNull();
    expect(readFileSync(join(w.dir, "b.ts"), "utf8")).toBe("fautif");
    expect(ci.filter((d) => d === w.dir)).toHaveLength(2);
    expect(g(repo, "branch", "--list", w.branch)).not.toBe("");
    await flow.dispose();
  });
  it("branche absente ou sans commit d'avance: rien a reprendre", async () => {
    const { flow } = setup();
    expect(await flow.resumeSector("wt/inconnue", "/nulle/part")).toBeNull();
    const w = await flow.startSector("implementation", "vide");
    expect(await flow.resumeSector(w.branch, w.dir)).toBeNull();
    await flow.dispose();
  });
});
