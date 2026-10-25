/**
 * Worktrees des secteurs (extrait de git.ts) : creation, reprise d'une branche refusee, commit, liberation.
 *
 * Quoi : `createSectors({ run, git, cwd, lock, dev, trailer })` -> `{ startSector, resumeSector, commit, release, installFail, commitFail }`.
 *        `resumeSector` rouvre le worktree d'une carte refusee (ou le recree sur sa branche) au lieu de repartir de `developpement`.
 * Pourquoi : git.ts depassait 200 lignes; comportement inchange. Les echecs d'installation et de commit sont lus par `mergeIfGreen`.
 */
import { stripAnsi } from "./cleanOutput";
import type { Mutex } from "./concurrency";
import type { Run } from "./git";

/** Dependances fournies par le flux git. */
export interface SectorsDeps {
  run: Run;
  git: (args: string[], at?: string) => ReturnType<Run>;
  cwd: string;
  lock: Mutex;
  dev: string;
  trailer: string;
  ensureDev: () => Promise<void>;
}

/** Construit les operations de worktree d'un depot. */
export function createSectors({ run, git, cwd, lock, dev: DEV, trailer: TRAILER, ensureDev }: SectorsDeps) {
  /** Echecs d'installation par worktree (dir -> raison), lus par mergeIfGreen. */
  const installFail = new Map<string, string>();
  /** Echecs de `git commit` par worktree (dir -> raison): le travail reste dans le worktree, jamais « fusionne ». */
  const commitFail = new Map<string, string>();
  let seq = 0;

  async function startSector(sector: string, tag = "") {
    return lock.run(async () => {
      await ensureDev();
      const slug = [sector, tag].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "sector";
      const name = `${slug}-${Date.now()}-${seq++}`;
      const branch = `wt/${name}`;
      const dir = `${cwd.replace(/[\\/]+$/, "")}/.claude/worktrees/${name}`;
      const r = await git(["worktree", "add", "-b", branch, dir, DEV]);
      if (r.code !== 0) throw new Error(`worktree add failed: ${r.out}`);
      return { branch, dir };
    }).then(async (w) => {
      // Dependances propres au worktree (pas de jonction: "Denied ID" sous vitest, voir CLAUDE.md); hors verrou: en parallele.
      const ci = await run("npm", ["ci", "--prefer-offline", "--no-audit"], w.dir);
      if (ci.code !== 0) installFail.set(w.dir, `npm ci failed: ${stripAnsi(ci.out).slice(-500)}`);
      return w;
    });
  }

  async function resumeSector(branch: string, dir: string) {
    let recreated = false;
    const w = await lock.run(async () => {
      const ahead = await git(["rev-list", "--count", `${DEV}..${branch}`]);
      if (ahead.code !== 0 || ahead.out.trim() === "0") return null; // branche absente ou sans travail: rien a reprendre
      const inside = await git(["rev-parse", "--is-inside-work-tree"], dir);
      if (inside.code === 0 && inside.out.trim() === "true") return { branch, dir };
      await git(["worktree", "prune"]);
      recreated = (await git(["worktree", "add", dir, branch])).code === 0;
      return recreated ? { branch, dir } : null;
    });
    if (!w) return null;
    installFail.delete(dir); commitFail.delete(dir);
    if (recreated) { // dossier recree: dependances a reinstaller (un dossier conserve a deja les siennes)
      const ci = await run("npm", ["ci", "--prefer-offline", "--no-audit"], dir);
      if (ci.code !== 0) installFail.set(dir, `npm ci failed: ${stripAnsi(ci.out).slice(-500)}`);
    }
    return w;
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

  async function release(branch: string, dir: string): Promise<void> {
    if (commitFail.has(dir)) return; // le travail n'existe que dans le dossier
    installFail.delete(dir);
    await lock.run(async () => {
      const ahead = await git(["rev-list", "--count", `${DEV}..${branch}`]);
      await git(["worktree", "remove", "--force", dir]);
      if (ahead.code === 0 && ahead.out.trim() === "0") await git(["branch", "-D", branch]);
    });
  }

  return { startSector, resumeSector, commit, release, installFail, commitFail };
}
