/**
 * Push de `developpement` (extrait de git.ts).
 *
 * Quoi : `createPush(git, dev, enabled)` -> `pushDev()`; refspec explicite `dev:dev`, jamais master/main, integre le distant
 *        (fusion, pas de rebase) s'il est en avance, abandon propre sur conflit.
 * Usage : voir git.ts.
 */
type Git = (args: string[], at?: string) => Promise<{ code: number; out: string }>;

/** Resultat d'un push: `reason` dit pourquoi rien n'est parti (journal). */
export interface PushResult { pushed: boolean; reason?: string }

const strip = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, "");

/** Construit `pushDev` lie a un flux git. */
export function createPush(git: Git, DEV: string, push: boolean): () => Promise<PushResult> {
  /** Push de `developpement` seulement (refspec explicite), apres integration du distant s'il est en avance. */
  return async function pushDev(): Promise<PushResult> {
    if (!push) return { pushed: false, reason: "push desactive (BOUCLE_PUSH=0)" };
    if ((await git(["remote", "get-url", "origin"])).code !== 0) return { pushed: false, reason: "pas de remote origin" };
    if ((await git(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim() !== DEV) return { pushed: false, reason: `push refuse : pas sur ${DEV}` };
    const doPush = () => git(["push", "origin", `${DEV}:${DEV}`]);
    let r = await doPush();
    if (r.code === 0) return { pushed: true };
    // rejete: integrer le distant (fusion, jamais de rebase d'un historique fusionne) puis repousser une fois
    const f = await git(["pull", "--no-rebase", "--no-edit", "origin", DEV]);
    if (f.code !== 0) {
      await git(["merge", "--abort"]);
      return { pushed: false, reason: `push rejete, conflit avec origin/${DEV} : ${strip(f.out).slice(-300)}` };
    }
    r = await doPush();
    return r.code === 0 ? { pushed: true } : { pushed: false, reason: `push echoue : ${strip(r.out).slice(-300)}` };
  }
}
