// @vitest-environment node
/** Worktrees orphelins (depot reel): le travail non fusionne est archive sur sa branche avant tout retrait, les worktrees retenus sont gardes. */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Run } from "./git";
import { sweepWorktrees } from "./orphans";
import { gitEnv } from "./testUtil";

vi.setConfig({ testTimeout: 60_000 });
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const env = gitEnv();
const g = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", env }).trim();
const run: Run = async (cmd, args, cwd) => { const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env }); return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") }; };

function repo() {
  const r = mkdtempSync(join(tmpdir(), "orph-")); dirs.push(r);
  g(r, "init", "-q", "-b", "developpement");
  writeFileSync(join(r, "a.txt"), "a"); g(r, "add", "-A"); g(r, "commit", "-qm", "init");
  const wt = (name: string) => { const d = join(r, ".claude", "worktrees", name); g(r, "worktree", "add", "-q", "-b", `wt/${name}`, d, "developpement"); return d; };
  return { r, wt };
}

describe("sweepWorktrees", () => {
  it("worktree sale non retenu: travail commite sur sa branche (recuperable), dossier retire, branche gardee", async () => {
    const { r, wt } = repo();
    const d = wt("implementation-x-1-0");
    writeFileSync(join(d, "new.ts"), "work");
    const out = await sweepWorktrees({ run, cwd: r, dev: "developpement", keep: new Set() });
    expect(out).toEqual([{ dir: d, branch: "wt/implementation-x-1-0", action: "archived" }]);
    expect(existsSync(d)).toBe(false);
    expect(g(r, "show", "wt/implementation-x-1-0:new.ts")).toBe("work");
    expect(g(r, "log", "-1", "--format=%s", "wt/implementation-x-1-0")).toContain("WIP");
  });
  it("worktree retenu (carte a reprendre): intact", async () => {
    const { r, wt } = repo();
    const d = wt("implementation-y-2-0"); writeFileSync(join(d, "w.ts"), "w");
    const out = await sweepWorktrees({ run, cwd: r, dev: "developpement", keep: new Set([d]) });
    expect(out).toEqual([{ dir: d, branch: "wt/implementation-y-2-0", action: "kept" }]);
    expect(existsSync(join(d, "w.ts"))).toBe(true);
  });
  it("worktree propre sans commit: retire sans rien perdre; branche gardee", async () => {
    const { r, wt } = repo();
    const d = wt("research-z-3-0");
    const out = await sweepWorktrees({ run, cwd: r, dev: "developpement", keep: new Set() });
    expect(out[0].action).toBe("removed");
    expect(existsSync(d)).toBe(false);
    expect(g(r, "branch", "--list", "wt/research-z-3-0")).not.toBe("");
  });
  it("hors .claude/worktrees ou hors wt/: jamais touche", async () => {
    const { r } = repo();
    const other = join(mkdtempSync(join(tmpdir(), "other-")), "x"); dirs.push(other);
    g(r, "worktree", "add", "-q", "-b", "perso", other, "developpement"); writeFileSync(join(other, "m.ts"), "m");
    expect(await sweepWorktrees({ run, cwd: r, dev: "developpement", keep: new Set() })).toEqual([]);
    expect(existsSync(join(other, "m.ts"))).toBe(true);
  });
  it("commit impossible: le worktree reste en place (rien n'est supprime)", async () => {
    const { r, wt } = repo();
    const d = wt("implementation-w-4-0"); writeFileSync(join(d, "k.ts"), "k");
    const failing: Run = async (cmd, args, cwd) => (args[0] === "commit" ? { code: 1, out: "boom" } : run(cmd, args, cwd));
    const out = await sweepWorktrees({ run: failing, cwd: r, dev: "developpement", keep: new Set() });
    expect(out[0].action).toBe("left");
    expect(existsSync(join(d, "k.ts"))).toBe(true);
  });
});
