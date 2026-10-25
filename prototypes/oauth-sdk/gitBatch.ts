/**
 * Verification finale d'un lot et push (extrait de git.ts).
 *
 * Quoi : `createBatch(...)` -> `finishBatch()` : apres la derniere fusion du lot, UNE suite complete + tsc sur `developpement`
 *        (worktree de reference, jamais l'arbre de l'utilisateur), puis push seulement si elle est verte et si `developpement`
 *        n'a pas bouge pendant la verification. `unpushed()` compte les commits locaux absents d'origin.
 * Reprise : un run interrompu laisse des fusions locales non poussees; au run suivant le pipeline appelle `finishBatch()` (meme
 *        regle : suite complete sur l'etat courant, push seulement si verte).
 * Usage : voir pipeline.ts / rounds.ts.
 */
import type { Proof } from "./card";
import type { Mutex } from "./concurrency";
import type { PushResult } from "./gitPush";

type Git = (args: string[], at?: string) => Promise<{ code: number; out: string }>;

/** Resultat de la verification de fin de lot. */
export interface BatchResult {
  /** Rien a verifier (aucune fusion depuis la derniere verification, rien de non pousse). */
  skipped?: boolean;
  /** Suite complete + tsc verts sur developpement. */
  verified: boolean;
  pushed: boolean;
  /** Pourquoi pas verifie / pas pousse. */
  reason?: string;
  /** Commits locaux non pousses apres l'operation. */
  unpushed: number;
}

/** Dependances fournies par le flux git. */
export interface BatchDeps {
  git: Git;
  lock: Mutex;
  dev: string;
  onDev: () => Promise<boolean>;
  check: () => Promise<{ reason: string | null; proof?: Proof }>;
  pushDev: () => Promise<PushResult>;
}

/** Construit la verification de fin de lot. `markDirty` est appele a chaque fusion. */
export function createBatch({ git, lock, dev: DEV, onDev, check, pushDev }: BatchDeps) {
  let dirty = false;

  /** Commits de developpement absents d'origin/developpement (0 sans remote ni reference distante). */
  async function unpushed(): Promise<number> {
    if ((await git(["remote", "get-url", "origin"])).code !== 0) return 0;
    const r = await git(["rev-list", "--count", `origin/${DEV}..${DEV}`]);
    return r.code === 0 ? Number(r.out.trim()) || 0 : 0;
  }

  async function finishBatch(force = false): Promise<BatchResult> {
    const ahead = await unpushed();
    if (!dirty && !force && ahead === 0) return { skipped: true, verified: true, pushed: false, unpushed: 0 };
    const tip = (await git(["rev-parse", DEV])).out.trim();
    const r = await check(); // suite complete + tsc, une seule fois pour le lot
    if (r.reason) return { verified: false, pushed: false, reason: r.reason, unpushed: ahead };
    return lock.run(async () => {
      if ((await git(["rev-parse", DEV])).out.trim() !== tip) return { verified: false, pushed: false, reason: `${DEV} a avance pendant la verification : push retenu`, unpushed: ahead };
      dirty = false;
      if (!(await onDev())) return { verified: true, pushed: false, reason: `impossible de passer sur ${DEV}`, unpushed: ahead };
      const p = await pushDev();
      return { verified: true, pushed: p.pushed, reason: p.reason, unpushed: p.pushed ? 0 : await unpushed() };
    });
  }

  return { finishBatch, unpushed, markDirty: () => { dirty = true; } };
}
