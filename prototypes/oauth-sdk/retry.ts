/**
 * Reprise d'une carte refusee : worktree et session retenus, compteur d'essais, journal par carte (etat persistant).
 *
 * Quoi : `planRetry(state, flow, cards)` retrouve la branche/worktree refuses d'une des cartes (reprise via `flow.resumeSector`),
 *        sa session SDK et le contexte d'echec; `recordAttempt(...)` incremente les essais, memorise modeles, branche, session et
 *        derniere raison (ou efface tout si la fusion a reussi). `MAX_TRIES` essais au plus par carte (limits.ts).
 * Pourquoi : repartir de `developpement` avec une session neuve ne donnait jamais a l'agent le code fautif ni la raison du refus.
 * Usage : voir pipeline.ts `runOne`.
 */
import { failureOf, retryPrompt, type Refusal } from "./failureContext";
import type { GitFlow } from "./git";
import { MAX_TRIES } from "./limits";
import type { CardRun, Failure, StateStore } from "./runState";

/** Reprise decidee pour un agent. */
export interface RetryPlan {
  /** Worktree/branche refuses rouverts (sinon: nouveau worktree depuis developpement). */
  reuse?: { branch: string; dir: string };
  resume?: { sessionId: string; costUsd: number };
  /** Consigne a ajouter (contexte d'echec). */
  prompt?: string;
  /** Branches retenues d'autres cartes du lot, non reprises (travail conserve sur leur branche). */
  skipped: string[];
}

const entry = (st: StateStore, id: string): CardRun | undefined => st.load().cards[id];

/** Cherche la branche refusee a reprendre pour ce lot (la plus avancee en essais). */
export async function planRetry(state: StateStore | undefined, flow: Pick<GitFlow, "resumeSector">, cards: { id: string }[]): Promise<RetryPlan> {
  const plan: RetryPlan = { skipped: [] };
  if (!state || !cards.length) return plan;
  const held = cards.map((c) => ({ id: c.id, run: entry(state, c.id) })).filter((x) => x.run?.branch && x.run.dir && !x.run.deferred);
  held.sort((a, b) => (b.run!.tries) - (a.run!.tries));
  for (const h of held) {
    const r = h.run!;
    if (plan.reuse) { if (r.branch !== plan.reuse.branch) plan.skipped.push(r.branch!); continue; }
    const w = await flow.resumeSector(r.branch!, r.dir!);
    if (!w) continue;
    plan.reuse = w;
    if (r.sessionId) plan.resume = { sessionId: r.sessionId, costUsd: r.sessionCostUsd ?? 0 };
    if (r.failure) plan.prompt = retryPrompt(r.failure, cards.map((c) => c.id), r.tries, MAX_TRIES);
  }
  return plan;
}

/** Resultat d'un essai a memoriser. */
export interface Attempt {
  cards: { id: string }[];
  models: string[];
  merged: boolean;
  /** Refus a memoriser avec la branche retenue (absent: branche non conservee). */
  refusal?: Refusal & { reason?: string };
  kept?: { branch: string; dir: string };
  changed?: string[];
  session?: { id?: string; costUsd?: number };
}

/** Memorise un essai pour chaque carte du lot; fusionne = branche, session et echec effaces. */
export function recordAttempt(state: StateStore | undefined, a: Attempt): void {
  if (!state) return;
  state.update((s) => {
    for (const { id } of a.cards) {
      const c = s.cards[id] ?? { tries: 0, models: [] };
      c.tries += 1;
      c.models = [...c.models, ...a.models];
      if (a.merged) { c.branch = c.dir = c.sessionId = c.failure = undefined; c.sessionCostUsd = undefined; c.lastReason = undefined; }
      else {
        c.lastReason = (a.refusal?.reason ?? "non fusionne").slice(0, 500);
        const f: Failure = failureOf(a.refusal ?? {}, a.changed ?? [], c.tries - 1);
        c.failure = f;
        c.branch = a.kept?.branch; c.dir = a.kept?.dir;
        c.sessionId = a.kept ? a.session?.id : undefined; c.sessionCostUsd = a.kept ? a.session?.costUsd : undefined;
      }
      s.cards[id] = c;
    }
  });
}
