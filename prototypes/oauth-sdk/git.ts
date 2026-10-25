/**
 * Git loop for sector workers: dev branch, worktree per sector, commit,
 * merge only when checks are green. Never pushes, never touches master/main.
 * The command runner is injected so tests need no real git.
 */
import { failureDigest, stripAnsi } from "./cleanOutput";
import { createMutex } from "./concurrency";
import { failedFiles, failedTests, onlyOnBranch } from "./testFailures";

/** Runs a command; resolves with exit code and combined output. */
export type Run = (cmd: string, args: string[], cwd?: string) => Promise<{ code: number; out: string }>;

export interface GitFlow {
  /** Create branch `developpement` from the current branch if missing. Never touches master/main. */
  ensureDev(): Promise<void>;
  /** Create worktree + branch (then npm ci in it) `wt/<sector>[-<tag>]-<timestamp>-<n>` from developpement; returns {branch, dir}. `tag` = carte (agents en parallele). */
  startSector(sector: string, tag?: string): Promise<{ branch: string; dir: string }>;
  /** Commit all changes in dir (message + trailer), skip if nothing to commit. */
  commit(dir: string, message: string): Promise<boolean>;
  /**
   * Tests + tsc dans dir; si vert, sous verrou: synchronise la branche avec developpement (tests relances si developpement a avance),
   * fusion --no-ff, retrait du worktree, push. `conflict`: la synchro a echoue (la carte sera relancee en serie).
   */
  mergeIfGreen(branch: string, dir: string): Promise<{ merged: boolean; reason?: string; conflict?: boolean; preexisting?: string[]; push?: PushResult }>;
  /** Retire le worktree de reference (fin du run). */
  dispose(): Promise<void>;
  /** Pousse `developpement` vers origin (jamais master/main); integre le distant si le push est rejete. */
  pushDev(): Promise<PushResult>;
}

/** Resultat d'un push: `reason` dit pourquoi rien n'est parti (journal). */
export interface PushResult { pushed: boolean; reason?: string }

/** Options du flux git. */
export interface GitOpts {
  /** Pousser `developpement` apres chaque fusion validee (defaut: non; `BOUCLE_PUSH=0` le coupe dans boucle.ts). */
  push?: boolean;
}

const DEV = "developpement";
const TRAILER = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";

/** Build a GitFlow bound to repo root `cwd`, using runner `run`. */
export function createGitFlow(run: Run, cwd: string, opts: GitOpts = {}): GitFlow {
  const git = (args: string[], at = cwd) => run("git", args, at);

  /** Echecs d'installation par worktree (dir -> raison), lus par mergeIfGreen. */
  const installFail = new Map<string, string>();
  /** Echecs de `git commit` par worktree (dir -> raison): le travail reste dans le worktree, jamais « fusionne ». */
  const commitFail = new Map<string, string>();

  async function ensureDev(): Promise<void> {
    const r = await git(["rev-parse", "--verify", DEV]);
    if (r.code !== 0) await git(["branch", DEV]);
  }

  /** Verrou de l'arbre principal: creation de worktrees, checkout, fusion et push passent un par un. */
  const lock = createMutex();
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

  /** Worktree de reference (developpement detache), cree a la demande: sert a savoir si un test rouge l'est deja sur la base. */
  const baseLock = createMutex();
  let baseDir: string | null = null;
  async function baseFailures(files: string[]): Promise<string[] | null> {
    return baseLock.run(async () => {
      if (!baseDir) {
        const dir = await lock.run(async () => {
          const d = `${cwd.replace(/[\\/]+$/, "")}/.claude/worktrees/base-${Date.now()}`;
          return (await git(["worktree", "add", "--detach", d, DEV])).code === 0 ? d : null;
        });
        if (!dir) return null;
        if ((await run("npm", ["ci", "--prefer-offline", "--no-audit"], dir)).code !== 0) { await git(["worktree", "remove", "--force", dir]); return null; }
        baseDir = dir;
      } else await git(["checkout", "--detach", DEV], baseDir);
      const r = await run("npm", ["test", "--", ...files], baseDir);
      return r.code === 0 ? [] : failedTests(r.out);
    });
  }

  /** Tests + tsc en parallele (independants). Un test deja rouge sur la base ne bloque pas (`preexisting`); tsc rouge ou test introduit bloque. */
  async function checks(dir: string): Promise<{ reason: string | null; preexisting?: string[] }> {
    const [t, c] = await Promise.all([run("npm", ["test"], dir), run("npx", ["tsc", "--noEmit"], dir)]);
    if (c.code !== 0) return { reason: `npx tsc --noEmit failed: ${failureDigest(c.out)}` };
    if (t.code === 0) return { reason: null };
    const mine = failedTests(t.out);
    const base = mine.length ? await baseFailures(failedFiles(mine)) : null;
    if (!base) return { reason: `npm test failed: ${failureDigest(t.out)}` };
    const added = onlyOnBranch(mine, base);
    return added.length ? { reason: `npm test failed (introduit par la branche): ${added.join("; ")}\n${failureDigest(t.out)}` } : { reason: null, preexisting: mine };
  }

  async function mergeIfGreen(branch: string, dir: string) {
    const failed = installFail.get(dir);
    if (failed) return { merged: false, reason: failed };
    const noCommit = commitFail.get(dir);
    if (noCommit) return { merged: false, reason: `commit failed: ${noCommit}` };
    const first = await checks(dir);
    if (first.reason) return { merged: false, reason: first.reason };
    let preexisting = first.preexisting;
    return lock.run(async () => {
      if (!(await onDev())) return { merged: false, reason: `cannot switch to ${DEV}` };
      const ahead = await git(["rev-list", "--count", `${DEV}..${branch}`]);
      if (ahead.code === 0 && ahead.out.trim() === "0") return { merged: false, reason: "rien a fusionner (aucun commit sur la branche)" };
      // synchro: developpement a pu avancer pendant le travail de l'agent (autres cartes fusionnees)
      const head = (await git(["rev-parse", "HEAD"], dir)).out;
      const sync = await git(["merge", "--no-edit", DEV], dir);
      if (sync.code !== 0) {
        await git(["merge", "--abort"], dir);
        return { merged: false, conflict: true, reason: `merge conflict avec ${DEV}: ${stripAnsi(sync.out).slice(-500)}` };
      }
      if ((await git(["rev-parse", "HEAD"], dir)).out !== head) {
        const again = await checks(dir); // tests sur l'etat fusionne, pas sur l'etat de depart
        if (again.reason) return { merged: false, reason: `apres synchro avec ${DEV}: ${again.reason}` };
        preexisting = again.preexisting ?? preexisting;
      }
      const m = await git(["merge", "--no-ff", branch]);
      if (m.code !== 0) {
        await git(["merge", "--abort"]);
        return { merged: false, conflict: true, reason: `merge conflict: ${stripAnsi(m.out).slice(-500)}` };
      }
      await git(["worktree", "remove", "--force", dir]);
      return { merged: true, preexisting, push: await pushDev() };
    });
  }

  /** Push de `developpement` seulement (refspec explicite), apres integration du distant s'il est en avance. */
  async function pushDev(): Promise<PushResult> {
    if (!opts.push) return { pushed: false, reason: "push desactive (BOUCLE_PUSH=0)" };
    if ((await git(["remote", "get-url", "origin"])).code !== 0) return { pushed: false, reason: "pas de remote origin" };
    if ((await git(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() !== DEV) return { pushed: false, reason: `push refuse : pas sur ${DEV}` };
    const push = () => git(["push", "origin", `${DEV}:${DEV}`]);
    let r = await push();
    if (r.code === 0) return { pushed: true };
    // rejete: integrer le distant (fusion, jamais de rebase d'un historique fusionne) puis repousser une fois
    const f = await git(["pull", "--no-rebase", "--no-edit", "origin", DEV]);
    if (f.code !== 0) {
      await git(["merge", "--abort"]);
      return { pushed: false, reason: `push rejete, conflit avec origin/${DEV} : ${stripAnsi(f.out).slice(-300)}` };
    }
    r = await push();
    return r.code === 0 ? { pushed: true } : { pushed: false, reason: `push echoue : ${stripAnsi(r.out).slice(-300)}` };
  }

  async function dispose() {
    const d = baseDir; baseDir = null;
    if (d) await git(["worktree", "remove", "--force", d]);
  }

  return { ensureDev, startSector, commit, mergeIfGreen, pushDev, dispose };
}
