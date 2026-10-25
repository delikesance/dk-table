/**
 * Git loop for sector workers: dev branch, worktree per sector, commit,
 * merge only when checks are green. Never pushes, never touches master/main.
 * The command runner is injected so tests need no real git.
 */
import { stripAnsi } from "./cleanOutput";
import { createMutex } from "./concurrency";
import { createChecks } from "./gitChecks";

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
  /** Agent non fusionne : retire son worktree (npm ci pese des centaines de Mo); la branche reste (le travail y est), sauf si elle est vide. Sans effet si le commit a echoue. */
  release(branch: string, dir: string): Promise<void>;
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

  const { checks, dispose: disposeChecks } = createChecks({ run, git, cwd, lock, dev: DEV });

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
      const before = (await git(["rev-parse", "HEAD"])).out.trim();
      const m = await git(["merge", "--no-ff", branch]);
      if (m.code !== 0) {
        await git(["merge", "--abort"]);
        return { merged: false, conflict: true, reason: `merge conflict: ${stripAnsi(m.out).slice(-500)}` };
      }
      // l'etat pousse doit etre celui qui a ete verifie: arbre fusionne = arbre teste dans le worktree, sinon annulation
      const merged = (await git(["rev-parse", "HEAD^{tree}"])).out.trim(), tested = (await git(["rev-parse", "HEAD^{tree}"], dir)).out.trim();
      if (merged !== tested) {
        await git(["reset", "--keep", before]);
        return { merged: false, reason: `arbre fusionne different de l'arbre verifie (${merged.slice(0, 8)} / ${tested.slice(0, 8)}) : fusion annulee` };
      }
      await git(["worktree", "remove", "--force", dir]);
      // suite non verte (tests deja rouges tolérés): on garde la fusion en local, jamais sur origin
      return { merged: true, preexisting, push: preexisting?.length ? { pushed: false, reason: "suite non verte (tests deja rouges sur la base) : push retenu" } : await pushDev() };
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

  async function release(branch: string, dir: string): Promise<void> {
    if (commitFail.has(dir)) return; // le travail n'existe que dans le dossier
    installFail.delete(dir);
    await lock.run(async () => {
      const ahead = await git(["rev-list", "--count", `${DEV}..${branch}`]);
      await git(["worktree", "remove", "--force", dir]);
      if (ahead.code === 0 && ahead.out.trim() === "0") await git(["branch", "-D", branch]);
    });
  }

  const dispose = disposeChecks;

  return { ensureDev, startSector, commit, mergeIfGreen, pushDev, release, dispose };
}
