/**
 * Git loop for sector workers: dev branch, worktree per sector, commit,
 * merge only when checks are green. Never pushes, never touches master/main.
 * The command runner is injected so tests need no real git.
 */

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
    if (ci.code !== 0) installFail.set(dir, `npm ci failed: ${ci.out.slice(-500)}`);
    return { branch, dir };
  }

  async function commit(dir: string, message: string): Promise<boolean> {
    await git(["add", "-A"], dir);
    const st = await git(["status", "--porcelain"], dir);
    if (st.out.trim() === "") return false;
    const r = await git(["commit", "-m", message, "-m", TRAILER], dir);
    return r.code === 0;
  }

  /** Ensure the root worktree is on developpement; false if impossible. */
  async function onDev(): Promise<boolean> {
    const cur = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
    if (cur.out.trim() === DEV) return true;
    return (await git(["checkout", DEV])).code === 0;
  }

  async function mergeIfGreen(branch: string, dir: string) {
    const bad = installFail.get(dir);
    if (bad) return { merged: false, reason: bad };
    const checks: [string, string[]][] = [
      ["npm", ["test"]],
      ["npx", ["tsc", "--noEmit"]],
    ];
    for (const [cmd, args] of checks) {
      const r = await run(cmd, args, dir);
      if (r.code !== 0) return { merged: false, reason: `${cmd} ${args.join(" ")} failed: ${r.out.slice(-500)}` };
    }
    if (!(await onDev())) return { merged: false, reason: `cannot switch to ${DEV}` };
    const m = await git(["merge", "--no-ff", branch]);
    if (m.code !== 0) {
      await git(["merge", "--abort"]);
      return { merged: false, reason: `merge conflict: ${m.out.slice(-500)}` };
    }
    await git(["worktree", "remove", "--force", dir]);
    return { merged: true };
  }

  return { ensureDev, startSector, commit, mergeIfGreen };
}
