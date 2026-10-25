/**
 * Secteurs de la boucle autres que la recherche : design (maquette HTML), implementation, correction.
 *
 * Quoi : definition de chaque secteur (prompt, modele, outils) + `runSector`, une requete
 *        Agent SDK avec `query` injectee (testable sans reseau).
 * Pourquoi : les agents editent et lancent les tests mais ne touchent jamais a git
 *        (branches, commits et fusions sont faits par la boucle, pas par l'agent).
 * Usage : `runSector(SECTORS[0], { query, maxBudgetUsd, env, log })` -> `{ costUsd, ok, text }`.
 */
import { agentOptions } from "./agentOptions";
import { beginDesignRun, promptFor, SECTOR_DEFS, type SectorDef } from "./sectorDefs";
export * from "./sectorDefs";
import { modelFor, type Task } from "./routing";
import type { Budget } from "./budget";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

/** Options de `runSector`. */
export interface RunSectorOpts {
  query: QueryFn;
  /** Plafond de cette requete (USD), transmis au SDK. */
  maxBudgetUsd: number;
  env?: Record<string, string>;
  log?: (line: string) => void;
  now?: () => number;
  abort?: AbortController;
  /** Dossier de travail de l'agent (worktree du secteur). */
  cwd?: string;
  /** Modele impose (route par tentative); defaut: premier de la table de routage. */
  model?: string;
  /**
   * Reprise d'une session SDK (option `resume`, meme `cwd` obligatoire): `prompt` remplace alors celui du secteur par la seule
   * consigne de reprise. `total_cost_usd` d'une session reprise est cumule: `priorCostUsd` en est retranche. Si la reprise ne
   * produit aucun resultat (session introuvable, erreur), repli: session neuve avec le prompt complet du secteur.
   */
  resume?: { sessionId: string; priorCostUsd: number; prompt: string };
}

/** Resultat d'une requete de secteur. */
export interface SectorRun { costUsd: number; ok: boolean; text: string; /** Session SDK (pour la reprise). */ sessionId?: string; /** Cout cumule de cette session. */ sessionCostUsd: number; /** Vrai si la reprise a du repli sur une session neuve. */ resumeFailed?: boolean }

/** Execute un secteur: une requete, cout lu sur le message `result`. */
export async function runSector(s: SectorDef, o: RunSectorOpts): Promise<SectorRun> {
  const log = o.log ?? (() => {});
  const now = o.now ?? Date.now;
  const t0 = now();
  log(`[${s.id}] debut (plafond $${o.maxBudgetUsd.toFixed(2)})${o.resume ? " reprise de session" : ""}`);
  const options = agentOptions("edit", {
    model: o.model ?? modelFor(s.id as Task, 0), maxTurns: s.maxTurns, maxBudgetUsd: o.maxBudgetUsd, env: o.env, abort: o.abort, cwd: o.cwd,
  });
  /** Une requete; `got` = un message `result` est arrive. */
  const go = async (prompt: string, extra: Record<string, unknown>, prior: number): Promise<SectorRun & { got: boolean }> => {
    const r: SectorRun & { got: boolean } = { costUsd: 0, ok: false, text: "", sessionCostUsd: 0, got: false };
    for await (const m of o.query({ prompt, options: { ...options, ...extra } })) {
      if (m.type !== "result") continue;
      r.got = true;
      r.sessionCostUsd = m.total_cost_usd ?? 0;
      r.costUsd += Math.max(0, r.sessionCostUsd - prior);
      r.ok = m.subtype === "success";
      r.text = m.result ?? "";
      r.sessionId = (m as { session_id?: string }).session_id ?? r.sessionId;
    }
    return r;
  };
  let out: SectorRun & { got: boolean };
  let resumeFailed = false;
  if (o.resume) {
    out = await go(o.resume.prompt, { resume: o.resume.sessionId }, o.resume.priorCostUsd).catch((e) => {
      if (o.abort?.signal.aborted) throw e;
      return { costUsd: 0, ok: false, text: "", sessionCostUsd: 0, got: false };
    });
    if (!out.got) { resumeFailed = true; log(`[${s.id}] reprise impossible, session neuve`); out = await go(s.prompt, {}, 0); }
  } else out = await go(s.prompt, {}, 0);
  log(`[${s.id}] fin $${out.costUsd.toFixed(2)} ${Math.round((now() - t0) / 1000)}s ${out.ok ? "ok" : "echec"}`);
  const { got: _g, ...res } = out;
  return { ...res, resumeFailed };
}

/** Contexte fourni par la boucle a un secteur. */
export interface SectorCtx {
  query: QueryFn;
  budget: Budget;
  emit: (e: BoucleEvent) => void;
  /** Worktree du secteur. */
  dir: string;
  signal: AbortSignal;
  env?: Record<string, string>;
  /** Consigne ajoutee au prompt de cette execution (ex. cartes de la tournee). */
  task?: string;
  /** Tentative (echecs precedents de la carte): monte dans la chaine de modeles. */
  attempt?: number;
  /** Remplacements de la table de routage (BOUCLE_MODELS). */
  models?: Partial<Record<Task, string[]>>;
  /** Agents de ce secteur qui tournent en meme temps: la part de budget du secteur est divisee entre eux. */
  slots?: number;
  /** Consigne de reprise (contexte d'echec) envoyee a la session reprise; `task` la contient aussi pour le repli sur une session neuve. */
  retryPrompt?: string;
  /** Session d'un essai precedent dans CE worktree: reprise au lieu d'une session neuve (voir `RunSectorOpts.resume`). */
  resume?: { sessionId: string; costUsd: number };
}

/** Ce que l'execution d'un secteur laisse au pipeline (essais suivants). */
export interface SectorOut { models: string[]; sessionId?: string; sessionCostUsd?: number }

/** Secteur executable par la boucle. */
export interface Sector {
  name: SectorDef["id"];
  run(ctx: SectorCtx): Promise<SectorOut | void>;
}

/** AbortController relaie depuis un AbortSignal (le SDK attend un controleur). */
export function toController(signal: AbortSignal): AbortController {
  const ac = new AbortController();
  if (signal.aborted) ac.abort();
  else signal.addEventListener("abort", () => ac.abort(), { once: true });
  return ac;
}

/** Passes max par secteur (une seconde seulement si la premiere echoue et qu'il reste du budget). */
const MAX_PASSES = 2;

/** Construit le secteur executable: runSector sous reserve/settle, arret si budget epuise ou abandon. */
function makeSector(d: SectorDef): Sector {
  return {
    name: d.id,
    async run(ctx) {
      const t0 = Date.now();
      const cap = ctx.budget.cap();
      let cost = 0;
      const models: string[] = [];
      let session = ctx.resume ? { id: ctx.resume.sessionId, cost: ctx.resume.costUsd } : undefined;
      if (d.id === "design") beginDesignRun();
      ctx.emit({ type: "start", sector: d.id });
      const abort = toController(ctx.signal);
      const full = promptFor(d) + (ctx.task ? `\n\n${ctx.task}` : "");
      for (let i = 0; i < MAX_PASSES && !ctx.signal.aborted && !ctx.budget.exhausted(); i++) {
        const granted = ctx.budget.reserve((cap * d.share) / Math.max(1, ctx.slots ?? 1));
        if (granted <= 0) break;
        const model = modelFor(d.id as Task, (ctx.attempt ?? 0) + i, ctx.models);
        models.push(model);
        // 1re passe: reprise de la session de l'essai precedent (meme worktree); passe suivante: reprise de la passe qui vient de finir
        const resume = session ? { sessionId: session.id, priorCostUsd: session.cost, prompt: i === 0 && ctx.retryPrompt ? ctx.retryPrompt : "La passe precedente s'est arretee avant la fin. Reprends la ou tu t'es arrete et termine le travail." } : undefined;
        const r = await runSector({ ...d, prompt: full }, { query: ctx.query, maxBudgetUsd: granted, env: ctx.env, abort, cwd: ctx.dir, model, resume });
        ctx.budget.settle(granted, r.costUsd);
        cost += r.costUsd;
        session = r.sessionId ? { id: r.sessionId, cost: r.sessionCostUsd } : undefined;
        if (r.ok) break;
      }
      ctx.emit({
        type: "end", sector: d.id, costUsd: cost, elapsedS: Math.round((Date.now() - t0) / 1000),
        totalUsd: ctx.budget.spent(), remainingUsd: ctx.budget.left(),
      });
      return { models, sessionId: session?.id, sessionCostUsd: session?.cost };
    },
  };
}

/** Les trois secteurs, dans l'ordre d'execution. */
export const SECTORS: Sector[] = SECTOR_DEFS.map(makeSector);
