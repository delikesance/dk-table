/**
 * Fin de lot du pipeline : suite complete unique, push conditionnel, drapeau « non pousse » persistant.
 *
 * Quoi : `makeFinish({ flow, emit, state })` -> `(force?) => Promise<BatchResult>` (git.ts `finishBatch`) qui journalise le resultat
 *        et memorise `state.unpushed`. `recoverUnpushed(...)` : au debut d'un run, des fusions locales non poussees (run interrompu)
 *        relancent la suite complete sur l'etat courant, et ne sont poussees que si elle est verte.
 * Usage : voir pipeline.ts.
 */
import type { BatchResult, GitFlow } from "./git";
import type { StateStore } from "./runState";
import type { BoucleEvent } from "./server";

/** Dependances de la fin de lot. */
export interface FinishDeps { flow: Pick<GitFlow, "finishBatch" | "unpushed">; emit: (e: BoucleEvent) => void; state?: StateStore }

/** Verifie le lot (suite complete une seule fois), pousse si vert, et rend compte. */
export function makeFinish({ flow, emit, state }: FinishDeps): (force?: boolean) => Promise<BatchResult> {
  return async (force = false) => {
    const r = await flow.finishBatch(force);
    if (!r.skipped) {
      emit({ type: "info", message: r.verified
        ? (r.pushed ? "suite complete du lot verte : developpement pousse sur origin" : `suite complete du lot verte ; push non effectue : ${r.reason ?? "?"}`)
        : `anomalie : suite complete du lot ROUGE sur developpement, aucun push : ${(r.reason ?? "?").slice(0, 400)}` });
    }
    state?.update((s) => { s.unpushed = r.unpushed > 0; });
    return r;
  };
}

/** Debut de run : des commits locaux non pousses (ou le drapeau memorise) declenchent la meme verification avant tout push. */
export async function recoverUnpushed(flow: FinishDeps["flow"], finish: ReturnType<typeof makeFinish>, emit: FinishDeps["emit"], state?: StateStore): Promise<void> {
  const n = await flow.unpushed();
  if (n === 0 && !state?.load().unpushed) return;
  emit({ type: "info", message: `fusions locales non poussees detectees${n ? ` (${n} commit(s))` : ""} : suite complete relancee sur l'etat courant avant tout push` });
  await finish(true);
}
