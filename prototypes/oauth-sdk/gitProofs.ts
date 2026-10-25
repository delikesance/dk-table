/**
 * Ecriture des preuves par le code (extrait de git.ts).
 *
 * Quoi : `createProofs(...)` -> `writeProofs(proof, prove)` (commit `Boucle: preuves <ids> [boucle-proof]` apres une fusion verte,
 *        sous le verrou, arbre principal sur developpement; echec = arbre remis propre) et `reprove(prove)` (suite complete sur le
 *        worktree de reference, puis le meme commit; pour les rapports complets dont les preuves manquent).
 * Pourquoi : le commit de preuves ne touche que `docs/rapports/` et `TODO.md` (aucune nouvelle verification, voir `isMeta` dans git.ts),
 *        reste identifiable dans `git log` et le journal, et n'est jamais lu comme une carte ou une iteration.
 */
import { stripAnsi } from "./cleanOutput";
import type { Proof } from "./card";
import type { Mutex } from "./concurrency";

type Git = (args: string[], at?: string) => Promise<{ code: number; out: string }>;

/** Dependances fournies par le flux git. */
export interface ProofDeps {
  git: Git;
  lock: Mutex;
  /** Arbre principal sur developpement (faux = impossible). */
  onDev: () => Promise<boolean>;
  /** Verification complete de developpement (worktree de reference). */
  check: () => Promise<{ reason: string | null; proof?: Proof }>;
  trailer: string;
}

/** Construit les ecrivains de preuves. */
export function createProofs({ git, lock, onDev, check, trailer }: ProofDeps) {
  /** A appeler sous le verrou, arbre principal sur developpement. */
  async function writeProofs(proof: Proof | undefined, prove?: (p: Proof) => Promise<string[]>): Promise<{ proofCommit?: string; proofError?: string }> {
    if (!prove || !proof) return {};
    const undo = () => git(["checkout", "--", "docs/rapports", "TODO.md"]);
    try {
      const ids = await prove(proof);
      if (!ids.length) return {};
      await git(["add", "--", "docs/rapports", "TODO.md"]);
      const c = await git(["commit", "-m", `Boucle: preuves ${ids.join(", ")} [boucle-proof]`, "-m", "Ecrit par le code apres fusion verte (rapports + TODO.md); aucune verification supplementaire.", "-m", trailer]);
      if (c.code !== 0) { await undo(); return { proofError: stripAnsi(c.out).slice(-300) }; }
      return { proofCommit: (await git(["rev-parse", "--short", "HEAD"])).out.trim() };
    } catch (e) { await undo(); return { proofError: (e as Error).message }; }
  }

  async function reprove(prove: (p: Proof) => Promise<string[]>) {
    const r = await check(); // hors verrou: le worktree de reference prend lui-meme le verrou pour sa creation
    if (r.reason || !r.proof) return { proved: [], reason: r.reason ?? "pas de resultat de verification" };
    return lock.run(async () => {
      if (!(await onDev())) return { proved: [], reason: "impossible de passer sur developpement" };
      let ids: string[] = [];
      const w = await writeProofs(r.proof, async (p) => (ids = await prove(p)));
      return w.proofError ? { proved: [], reason: w.proofError } : { proved: ids, proofCommit: w.proofCommit };
    });
  }

  return { writeProofs, reprove };
}
