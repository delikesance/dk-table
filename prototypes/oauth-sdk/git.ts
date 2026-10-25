/**
 * Git loop for sector workers: dev branch, worktree per sector, commit,
 * merge only when checks are green. Never pushes, never touches master/main.
 * The command runner is injected so tests need no real git.
 */
import { failureDigest, stripAnsi } from "./cleanOutput";

/** Runs a command; resolves with exit code and combined output. */
export type Run = (cmd: string, args: string[], cwd?: string) => Promise<{ code: number; out: string }>;

export interface GitFlow {
  /** Create branch `developpement` from the current branch if missing. Never touches master/main. */
  ensureDev(): Promise<void>;
  /** Create worktree + branch (then npm ci in it) `wt/<sector>-<timestamp>` from developpement; returns {branch, dir}. */
  startSector(sector: string): Promise<{ branch: string; dir: string }>;
  /** Commit all changes in dir (message + trailer), skip if nothing to commit. */
  commit(dir: string, message: string): Promise<boolean>;
  /** Run tests + tsc in dir; if green merge --no-ff into developpement and remove the worktree. */
  mergeIfGreen(branch: string, dir: string): Promise<{ merged: boolean; reason?: string }>;
}

const DEV = "developpement";
const TRAILER = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";

/** Build a GitFlow bound to repo root `cwd`, using runner `run`. */
export function createGitFlow(run: Run, cwd: string): GitFlow {
  const git = (args: string[], at = cwd) => run("git", args, at);

  /** Echecs d'installation par worktree (dir -> raison), lus par mergeIfGreen. */
  const installFail = new Map<string, string>();
  /** Echecs de `git commit` par worktree (dir -> raison): le travail reste dans le worktree, jamais « fusionne ». */
  const commitFail = new Map<string, string>();

  async function ensureDev(): Promise<void> {
    const r = await git(["rev-parse", "--verify", DEV]);
    if (r.code !== 0) await git(["branch", DEV]);
  }

  async function startSector(sector: string) {
    await ensureDev();
    const slug = sector.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "sector";
    const stamp = Date.now();
    const branch = `wt/${slug}-${stamp}`;
    const dir = `${cwd.replace(/[\\/]+$/, "")}/.claude/worktrees/${slug}-${stamp}`;
    const r = await git(["worktree", "add", "-b", branch, dir, DEV]);
    if (r.code !== 0) throw new Error(`worktree add failed: ${r.out}`);
    // Dependances propres au worktree (pas de jonction: "Denied ID" sous vitest, voir CLAUDE.md).
    const ci = await run("npm", ["ci", "--prefer-offline", "--no-audit"], dir);
    if (ci.code !== 0) installFail.set(dir, `npm ci failed: ${stripAnsi(ci.out).slice(-500)}`);
    return { branch, dir };
  }

  async function commit(dir: string, message: string): Promise<boolean> {
    await git(["add", "-A"], dir);
    const st = await git(["status", "--porcelain"], dir);
    if (st.out.trim() === "") return false;
    const r = await git(["commit", "-m", message, "-m", TRAILER], dir);
    if (r.code !== 0) commitFail.set(dir, stripAnsi(r.out).slice(-300));
    else commitFail.delete(dir);
    return r.code === 0;
  }

  /** Ensure the root worktree is on developpement; false if impossible. */
  async function onDev(): Promise<boolean> {
    const cur = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
    if (cur.out.trim() === DEV) return true;
    return (await git(["checkout", DEV])).code === 0;
  }

  async function mergeIfGreen(branch: string, dir: string) {
    const failed = installFail.get(dir);
    if (failed) return { merged: false, reason: failed };
    const noCommit = commitFail.get(dir);
    if (noCommit) return { merged: false, reason: `commit failed: ${noCommit}` };
    const checks: [string, string[]][] = [
      ["npm", ["test"]],
      ["npx", ["tsc", "--noEmit"]],
    ];
    // tests et tsc en parallele (independants): le gain est le plus long des deux au lieu de leur somme
    const results = await Promise.all(checks.map(([cmd, args]) => run(cmd, args, dir)));
    const bad = results.findIndex((r) => r.code !== 0);
    if (bad >= 0) {
      const [cmd, args] = checks[bad];
      return { merged: false, reason: `${cmd} ${args.join(" ")} failed: ${failureDigest(results[bad].out)}` };
    }
    if (!(await onDev())) return { merged: false, reason: `cannot switch to ${DEV}` };
    const ahead = await git(["rev-list", "--count", `${DEV}..${branch}`]);
    if (ahead.code === 0 && ahead.out.trim() === "0") return { merged: false, reason: "rien a fusionner (aucun commit sur la branche)" };
    const m = await git(["merge", "--no-ff", branch]);
    if (m.code !== 0) {
      await git(["merge", "--abort"]);
      return { merged: false, reason: `merge conflict: ${stripAnsi(m.out).slice(-500)}` };
    }
    await git(["worktree", "remove", "--force", dir]);
    return { merged: true };
  }

  return { ensureDev, startSector, commit, mergeIfGreen };
}
