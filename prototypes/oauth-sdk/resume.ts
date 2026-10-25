/**
 * Debut de run : reprise d'un run interrompu ou etat neuf, puis nettoyage des worktrees orphelins.
 *
 * Quoi : `beginRun({ state, run, cwd, dev, runId })` -> `{ resumed, swept }`. Si le run precedent ne s'est pas termine
 *        proprement (`finished` faux), son etat est repris (essais, branches retenues, planificateur) et les worktrees
 *        des cartes encore a traiter sont gardes; sinon l'etat repart a vide. Dans les deux cas, les autres worktrees
 *        de la boucle sont archives puis retires (orphans.ts), jamais sans commit prealable de leur contenu.
 * Usage : appele par le pipeline apres `ensureDev`.
 */
import type { Run } from "./git";
import { sweepWorktrees, type Swept } from "./orphans";
import { emptyState, type StateStore } from "./runState";

/** Parametres du debut de run. */
export interface BeginOpts { state?: StateStore; run: Run; cwd: string; dev: string; runId: string }

/** Prepare l'etat et le disque pour un run. */
export async function beginRun(o: BeginOpts): Promise<{ resumed: boolean; swept: Swept[] }> {
  if (!o.state) return { resumed: false, swept: [] };
  const prev = o.state.load();
  const resumed = !prev.finished;
  const keep = new Set<string>();
  if (resumed) {
    for (const c of Object.values(prev.cards)) if (c.dir && !c.deferred) keep.add(c.dir);
    o.state.update((s) => { s.finished = false; });
  } else {
    o.state.update((s) => { Object.assign(s, emptyState(o.runId), { finished: false }); });
  }
  const swept = await sweepWorktrees({ run: o.run, cwd: o.cwd, dev: o.dev, keep });
  return { resumed, swept };
}
