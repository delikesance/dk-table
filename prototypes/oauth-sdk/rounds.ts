/**
 * Planificateur des tournees implementation + correction.
 *
 * Quoi : choisit le lot de chaque tournee (grand lot, cartes les plus avancees d'abord), mesure le progres
 *        par avancee d'etat (idee -> en-cours -> preuves -> termine) et fait tourner les cartes qui
 *        n'avancent pas arrivent a la borne dure d'essais (tries.ts): la carte est alors bloquee avec sa raison et n'est plus lancee.
 * Pourquoi : la boucle ne s'arrete qu'a la fin des cartes, au budget epuise, ou apres `patience` tournees
 *        sans la moindre avancee; l'arret dit pourquoi (`stopMessage`), jamais « terminee » s'il reste des cartes.
 * Usage : `const p = createPlanner(); p.observe(cards); p.nextBatch(cards); p.observe(cards); p.stuck()`.
 */
import { allDone, type BoardCard } from "./cards";
import { BATCH as LOT, MAX_ROUNDS, PATIENCE } from "./limits";
import { enforceLimit } from "./tries";
import { runBatch, type AgentResult } from "./parallel";
import { reportRules } from "./reportRules";
import type { PlannerState, StateStore } from "./runState";
import type { Deferred } from "./selectBatch";
import type { BoucleEvent } from "./server";

/** Raison de fin de boucle. */
export type StopReason = "complete" | "budget" | "stuck" | "abort" | "max-rounds" | "blocked";

/** Cartes par tournee. */
export const BATCH = LOT;
/** Etats du plus avance au moins avance (reprise des cartes commencees d'abord). */
const RANK: Record<string, number> = { preuves: 0, "en-cours": 1, bloque: 2, piste: 3, idee: 4 };
/** Avancement d'un etat (progres = score qui monte). */
const SCORE: Record<string, number> = { idee: 0, piste: 0, bloque: 0, "en-cours": 1, preuves: 2, termine: 3 };

/** Options du planificateur. */
export interface PlannerOpts { batch?: number; patience?: number; maxRounds?: number }

/** Cree le planificateur d'un run. */
export function createPlanner(o: PlannerOpts = {}) {
  const batch = o.batch ?? BATCH, patience = o.patience ?? PATIENCE;
  const seen = new Map<string, number>();
  const fails = new Map<string, number>();
  let last = new Set<string>();
  let rounds = 0, idle = 0;
  return {
    maxRounds: o.maxRounds ?? MAX_ROUNDS,
    /** Lot de la tournee: non terminees et non bloquees par le code, les plus avancees d'abord. */
    nextBatch<T extends Pick<BoardCard, "id" | "state"> & { blockReason?: string }>(cards: T[]): T[] {
      const lot = cards.filter((c) => c.state !== "termine" && !c.blockReason)
        .sort((a, b) => (RANK[a.state] ?? 9) - (RANK[b.state] ?? 9))
        .slice(0, batch);
      last = new Set(lot.map((c) => c.id)); rounds++;
      return lot;
    },
    /** Compare a l'etat precedent; vrai si au moins une carte a avance (les cartes du lot sans progres comptent un echec). */
    observe(cards: Pick<BoardCard, "id" | "state">[]): boolean {
      let progress = false;
      for (const c of cards) {
        const now = SCORE[c.state] ?? 0, before = seen.get(c.id);
        const up = before !== undefined && now > before;
        if (up) progress = true;
        if (last.has(c.id)) fails.set(c.id, up || c.state === "termine" ? 0 : (fails.get(c.id) ?? 0) + 1);
        seen.set(c.id, now);
      }
      last = new Set();
      if (rounds > 0) idle = progress ? 0 : idle + 1;
      return progress;
    },
    /** Tentative du lot: plus gros nombre d'echecs d'une de ses cartes (route vers un modele plus gros). */
    attempt: (ids: string[]): number => Math.max(0, ...ids.map((id) => fails.get(id) ?? 0)),
    /** Etat serialisable (persiste dans .boucle/state.json). */
    snapshot: (): PlannerState => ({ fails: Object.fromEntries(fails), seen: Object.fromEntries(seen), idle, rounds }),
    /** Reprend un etat persiste (run interrompu). */
    restore(s: PlannerState) {
      fails.clear(); seen.clear();
      for (const [k, v] of Object.entries(s.fails)) fails.set(k, v);
      for (const [k, v] of Object.entries(s.seen)) seen.set(k, v);
      idle = s.idle; rounds = s.rounds;
    },
    /** Vrai apres `patience` tournees de suite sans aucune avancee. */
    stuck: () => idle >= patience,
  };
}

/** Phrase d'arret pour le journal et le panneau (cartes restantes nommees avec leur etat). */
export function stopMessage(reason: StopReason, left: Pick<BoardCard, "id" | "state">[]): string {
  const list = left.map((c) => `${c.id} (${c.state})`).join(", ");
  switch (reason) {
    case "complete": return "boucle terminee : toutes les cartes sont terminees";
    case "budget": return `budget epuise : ${left.length} carte(s) restante(s) : ${list}`;
    case "blocked": return `boucle arretee, toutes les cartes restantes sont bloquees : ${left.map((c) => `${c.id} (${(c as { blockReason?: string }).blockReason ?? c.state})`).join(", ")}`;
    case "stuck": return `boucle bloquee, aucune carte n'avance : ${list}`;
    case "abort": return `arrete : ${left.length} carte(s) restante(s)`;
    default: return `tournees max atteintes : ${left.length} carte(s) restante(s) : ${list}`;
  }
}

/** Dependances de `runRounds` (injectees par le pipeline). */
export interface RoundsCtx {
  /** Tableau reconcilie; `active` = ids des cartes en cours de traitement (aucune apres une tournee). */
  board: (active?: string[]) => Promise<BoardCard[]>;
  /** Un agent d'implementation sur ces cartes (son worktree, sa fusion). */
  impl: (task: string, attempt: number, cards: BoardCard[]) => Promise<AgentResult>;
  /** Agents d'implementation simultanes au plus (defaut 1: un seul agent pour tout le lot). */
  parallel?: number;
  corr: (task: string, attempt: number) => Promise<boolean>;
  emit: (e: BoucleEvent) => void;
  /** Raison d'arret immediate (abandon, budget), sinon null. */
  halt: () => "abort" | "budget" | null;
  /** Cartes restantes apres chaque lecture du tableau. */
  progress: (remaining: number) => void;
  /** Preuves manquantes seulement (rapport complet): le code les ecrit sans agent; renvoie les ids prouves. */
  prove?: (cards: BoardCard[]) => Promise<string[]>;
  /** Qualification du lot (qualify.ts + selectBatch.ts): cartes retenues (avec fichiers et criteres) et cartes ecartees avec leur raison. */
  qualify?: (batch: BoardCard[]) => Promise<{ selected: BoardCard[]; deferred: Deferred[] }>;
  /** Fin de lot : suite complete unique sur developpement, push seulement si verte (voir finishLot.ts). */
  finish?: () => Promise<{ verified: boolean; skipped?: boolean; reason?: string }>;
  /** Etat persistant (absent: rien n'est ecrit). Un run interrompu (`finished` faux) reprend planificateur et `avoid`. */
  state?: StateStore;
  /** Depense du run (USD), ecrite avec l'etat. */
  spent?: () => number;
}

/** Tache de correction ciblee, ecrite par le code a partir des preuves manquantes (aucun modele ne « verifie »). */
function correctionTask(bad: Pick<BoardCard, "id" | "missing">[]): string {
  return "Cartes dont le rapport declare termine sans preuve valide : " + (bad.map((c) => `${c.id} (manque : ${c.missing.join(", ")})`).join("; ") || "aucune") + ".";
}

/**
 * Tournees implementation (+ correction seulement si le code l'exige) jusqu'a cartes terminees, budget epuise,
 * abandon, absence d'avancee ou garde-fou. La validation est du code: fusion refusee (tests/tsc), rapport sans preuves.
 */
export async function runRounds(c: RoundsCtx): Promise<{ complete: boolean; reason: StopReason; cards: BoardCard[] }> {
  const planner = createPlanner();
  const avoid = new Set<string>(); // cartes dont la fusion a deja fait un conflit: jamais en parallele
  const saved = c.state?.load();
  if (saved && !saved.finished) { planner.restore(saved.planner); saved.avoid.forEach((a) => avoid.add(a)); }
  const persist = (finished = false) => c.state?.update((s) => {
    s.finished = finished; s.planner = planner.snapshot(); s.avoid = [...avoid]; s.budget = { spentUsd: c.spent?.() ?? 0, reservedUsd: 0 };
  });
  const left = (cs: BoardCard[]) => cs.filter((x) => x.state !== "termine");
  let cards = await c.board();
  c.progress(left(cards).length);
  planner.observe(cards);
  let round = 0, reason: StopReason = "complete";
  while (!allDone(cards)) {
    if (left(cards).every((x) => x.blockReason)) { reason = "blocked"; break; }
    const h = c.halt();
    if (h) { reason = h; break; }
    if (planner.stuck()) { reason = "stuck"; break; }
    if (round >= planner.maxRounds) { reason = "max-rounds"; break; }
    round++;
    let batch = planner.nextBatch(cards);
    if (c.qualify && batch.length) {
      const q = await c.qualify(batch);
      c.state?.update((st) => { for (const d of q.deferred) st.cards[d.id] = { tries: 0, models: [], ...st.cards[d.id], deferred: { kind: d.kind, reason: d.reason } }; });
      if (q.deferred.length) c.emit({ type: "info", round, message: `cartes ecartees avant implementation : ${q.deferred.map((d) => `${d.id} (${d.kind}: ${d.reason})`).join(" | ")}` });
      batch = q.selected;
      if (!batch.length) { cards = await c.board(); c.progress(left(cards).length); persist(); continue; } // rien a lancer: les ecartees sont bloquees, la tournee suivante prend les autres
    }
    const ids = batch.map((b) => b.id), attempt = planner.attempt(ids);
    c.emit({ type: "info", round, cards: ids, message: `tournee ${round} : ${left(cards).length} carte(s) restante(s), lot ${ids.join(", ")}` });
    const merged = await runBatch(batch, {
      n: c.parallel ?? 1, avoid, stop: () => !!c.halt(), emit: c.emit, attempt: planner.attempt, rules: reportRules,
      run: (cards, task, a) => c.impl(task, a, cards),
    });
    cards = await c.board();
    const isBad = (x: BoardCard) => ids.includes(x.id) && x.state === "preuves";
    const provable = cards.filter((x) => isBad(x) && x.missing.length === 1 && x.missing[0] === "preuves");
    if (provable.length && c.prove && !c.halt() && (await c.prove(provable)).length) cards = await c.board();
    const bad = cards.filter(isBad);
    // la correction ne part JAMAIS de developpement pour un refus: la carte refusee est reprise sur sa branche (pipeline.ts, retry.ts)
    if (!c.halt() && bad.length) {
      await c.corr(correctionTask(bad), attempt);
      cards = await c.board();
    } else c.emit({ type: "info", round, message: merged ? "correction ignoree : lot valide par le code (aucun appel modele)" : "correction ignoree : cartes refusees reprises sur leur branche au prochain essai" });
    if (c.finish && !c.halt()) {
      const f = await c.finish();
      if (!f.verified && !f.skipped) { // developpement rouge apres le lot: correction depuis developpement (le code fautif y est), puis nouvelle verification
        await c.corr(`La suite complete sur developpement est rouge apres le lot (aucun push) : ${f.reason ?? "?"}`, attempt);
        cards = await c.board();
        await c.finish();
      }
    }
    const blocked = c.state ? enforceLimit(c.state, cards) : [];
    if (blocked.length) { c.emit({ type: "info", round, message: `cartes bloquees (limite d'essais) : ${blocked.map((b) => `${b.id} (${b.reason})`).join(" | ")}` }); cards = await c.board(); }
    c.progress(left(cards).length);
    planner.observe(cards);
    persist();
    const anomalies = cards.flatMap((x) => (x.anomalies ?? []).map((a) => `${x.id} : ${a}`));
    if (anomalies.length) c.emit({ type: "info", round, message: `anomalies (${anomalies.length}) : ${anomalies.slice(0, 5).join(" | ")}` });
  }
  persist(true);
  return { complete: allDone(cards), reason, cards };
}
