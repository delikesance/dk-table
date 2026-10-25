/**
 * Git loop for sector workers: dev branch, worktree per sector, commit,
 * merge only when checks are green. Never pushes, never touches master/main.
 * The command runner is injected so tests need no real git.
 */
import { stripAnsi } from "./cleanOutput";
import type { Proof } from "./card";
import { createProofs } from "./gitProofs";
import { createPush, type PushResult } from "./gitPush";
import { createMutex, type LockStat } from "./concurrency";
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
  mergeIfGreen(branch: string, dir: string, extra?: MergeExtra): Promise<MergeResult>;
  /** Agent non fusionne : retire son worktree (npm ci pese des centaines de Mo); la branche reste (le travail y est), sauf si elle est vide. Sans effet si le commit a echoue. */
  release(branch: string, dir: string): Promise<void>;
  /** Retire le worktree de reference (fin du run). */
  dispose(): Promise<void>;
  /** Preuves de cartes dont le rapport est complet mais sans preuves ecrites par le code: suite complete sur `developpement` (worktree de reference), puis commit de preuves si verte. Sans agent. */
  reprove(prove: (proof: Proof) => Promise<string[]>): Promise<{ proved: string[]; reason?: string; proofCommit?: string }>;
  /** Pousse `developpement` vers origin (jamais master/main); integre le distant si le push est rejete. */
  pushDev(): Promise<PushResult>;
}

/** Crochet apres une fusion verte: ecrit rapports/TODO dans l'arbre principal; renvoie les ids prouves (vide: rien a commiter). */
export interface MergeExtra { prove?: (proof: Proof) => Promise<string[]> }

/** Resultat de `mergeIfGreen`. `proofCommit`: commit `Boucle: preuves ...` ecrit apres la fusion (identifiable, jamais reverifie). */
export interface MergeResult {
  merged: boolean; reason?: string; conflict?: boolean; preexisting?: string[]; push?: PushResult;
  proof?: Proof; proofCommit?: string; proofError?: string;
}

/** Fichiers ecrits par le code (rapports, TODO.md): un changement qui ne touche qu'eux ne relance aucune verification. */
export const isMeta = (p: string) => p === "TODO.md" || p.startsWith("docs/rapports/");

export type { PushResult } from "./gitPush";

/** Options du flux git. */
export interface GitOpts {
  /** Mesure des verrous (nom, attente, duree): journal des attentes `lock`, `suiteLock`, `baseLock`. */
  onLock?: (s: LockStat) => void;
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
  const lock = createMutex({ name: "lock", onLock: opts.onLock });
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

  const { writeProofs, reprove } = createProofs({ git, lock, onDev, check: () => checkBase(), trailer: TRAILER });
  const pushDev = createPush(git, DEV, !!opts.push);
  const { checks, checkBase, dispose: disposeChecks } = createChecks({ run, git, cwd, lock, dev: DEV, onLock: opts.onLock });

  async function mergeIfGreen(branch: string, dir: string, extra: MergeExtra = {}): Promise<MergeResult> {
    const failed = installFail.get(dir);
    if (failed) return { merged: false, reason: failed };
    const noCommit = commitFail.get(dir);
    if (noCommit) return { merged: false, reason: `commit failed: ${noCommit}` };
    const first = await checks(dir);
    if (first.reason) return { merged: false, reason: first.reason };
    let preexisting = first.preexisting, proof = first.proof;
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
      const now = (await git(["rev-parse", "HEAD"], dir)).out;
      if (now !== head) {
        // un developpement qui n'a avance que par des preuves/TODO ecrits par le code ne justifie aucune nouvelle verification
        const moved = (await git(["diff", "--name-only", head.trim(), now.trim()], dir)).out.split(/\r?\n/).filter(Boolean);
        if (!moved.length || !moved.every(isMeta)) {
          const again = await checks(dir); // tests sur l'etat fusionne, pas sur l'etat de depart
          if (again.reason) return { merged: false, reason: `apres synchro avec ${DEV}: ${again.reason}` };
          preexisting = again.preexisting ?? preexisting;
          proof = again.proof ?? proof;
        }
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
      const prov = await writeProofs(proof, extra.prove);
      await git(["worktree", "remove", "--force", dir]);
      // suite non verte (tests deja rouges tolérés): on garde la fusion en local, jamais sur origin
      return { merged: true, preexisting, proof, ...prov, push: preexisting?.length ? { pushed: false, reason: "suite non verte (tests deja rouges sur la base) : push retenu" } : await pushDev() };
    });
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

  return { ensureDev, startSector, commit, mergeIfGreen, reprove, pushDev, release, dispose };
}
