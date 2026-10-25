/**
 * Resume Haiku de fin de phase pour le panneau de la boucle.
 *
 * Quoi : 1-2 phrases (agents en cours, avancement), plafond 0.05 USD, 1 tour, sans outil;
 *        cout regle dans le budget partage.
 * Defaut : deterministe (aucun processus Claude lance, aucun cout); `llm: true` pour un resume Haiku.
 * Pourquoi : ne jamais bloquer la boucle: au moindre echec (query, jeton, budget, reponse vide)
 *        on renvoie un resume deterministe sans LLM.
 * Usage : `await summarizePhase(state, { query, budget, env })` -> chaine.
 */
import type { Budget } from "./budget";
import { modelFor } from "./routing";
import type { QueryFn } from "./research";

/** Etat d'une phase ou d'un agent. */
export type Status = "pending" | "running" | "ok" | "failed";

/** Photographie de la boucle au moment du resume. */
export interface PhaseState {
  phase: string;
  phases: { name: string; status: Status }[];
  agents: { name: string; status: Status; costUsd?: number; note?: string }[];
  /** Cartes pas encore terminees (indefini: pas de tableau de cartes). */
  remaining?: number;
  /** Raison d'arret de la boucle quand il reste des cartes. */
  halt?: "budget" | "stuck" | "abort" | "max-rounds";
  spentUsd: number;
  remainingUsd: number;
  /** Taux EUR -> USD: tout s'affiche en euros (defaut 1,08, comme le budget). */
  eurUsd?: number;
}

/** Dependances: query injectee, budget partage, env (jeton OAuth) optionnels. */
export interface SummaryDeps {
  query: QueryFn;
  budget?: Budget;
  env?: Record<string, string>;
  /** Opt-in: resume redige par un LLM (defaut: texte deterministe, 0 spawn, 0 cout). */
  llm?: boolean;
}

/** Plafond d'un resume (USD). */
export const SUMMARY_CAP_USD = 0.05;

/** Montant en euros (converti depuis les dollars du SDK), format fr (virgule). */
const eur = (usd: number, rate = 1.08) => (usd / rate).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/** Phrase de chiffres, toujours calculee ici (jamais par le LLM): depense, plafond, reste. */
export function figures(s: PhaseState): string {
  const e = (n: number) => eur(n, s.eurUsd);
  return `Dépensé ${e(s.spentUsd)} sur ${e(s.spentUsd + s.remainingUsd)} (reste ${e(s.remainingUsd)}).`;
}

/** Vrai si toutes les phases sont reussies (boucle terminee). */
const finished = (s: PhaseState) => s.phases.length > 0 && s.phases.every((p) => p.status === "ok") && !s.remaining;

const HALT = { budget: "budget épuisé", stuck: "aucune carte n'avance", abort: "arrêt demandé", "max-rounds": "tournées max" };

/** Resume sans LLM: phases terminees puis en cours, suivi des chiffres. */
export function fallbackSummary(s: PhaseState): string {
  return `${statusLine(s)} ${figures(s)}`;
}

/** Partie qualitative du repli. */
function statusLine(s: PhaseState): string {
  if (finished(s)) return `Boucle terminée : ${s.phases.map((p) => p.name).join(", ")}.`;
  if (s.remaining && s.halt) return `Boucle arrêtée (${HALT[s.halt]}) : ${s.remaining} carte(s) restante(s).`;
  if (s.remaining && s.phases.every((p) => p.status === "ok")) return `Tournée terminée, ${s.remaining} carte(s) restante(s) : la boucle continue.`;
  const names = (st: Status) => s.phases.filter((p) => p.status === st).map((p) => p.name).join(", ");
  const done = names("ok"), failed = names("failed"), run = names("running");
  const parts = [done && `Terminé : ${done}.`, failed && `Échec : ${failed}.`, run && `En cours : ${run}.`].filter(Boolean);
  return parts.length ? parts.join(" ") : "Aucune phase démarrée.";
}

/** Resume de la phase; ne leve jamais. */
export async function summarizePhase(s: PhaseState, deps: SummaryDeps): Promise<string> {
  if (!deps.llm || (deps.env && !deps.env.CLAUDE_CODE_OAUTH_TOKEN)) return fallbackSummary(s);
  if (deps.budget?.exhausted()) return fallbackSummary(s);
  const granted = deps.budget ? deps.budget.reserve(SUMMARY_CAP_USD) : SUMMARY_CAP_USD;
  if (granted <= 0) return fallbackSummary(s);
  let cost = 0;
  let text = "";
  try {
    const { spentUsd: _s, remainingUsd: _r, eurUsd: _e, ...rest } = s; // `remaining` reste dans l'etat: pas « terminee » s'il reste des cartes
    const prompt =
      "Resume en francais, en 1 a 2 phrases COURTES, ce que font les agents et ou en est la boucle. " +
      "N'ecris jamais de montant ni de budget (ils sont ajoutes a part). Si terminee=true, dis que la boucle est terminee, " +
      `sans parler de phase en cours. Pas de markdown.\nEtat: ${JSON.stringify({ ...rest, terminee: finished(s) })}`;
    const stream = deps.query({
      prompt,
      options: {
        model: modelFor("summary", 0), maxTurns: 1, maxBudgetUsd: granted, tools: [], allowedTools: [],
        permissionMode: "dontAsk", settingSources: [], env: deps.env,
      },
    });
    for await (const m of stream) {
      if (m.type !== "result") continue;
      cost += m.total_cost_usd ?? 0;
      if (m.subtype === "success") text = (m.result ?? "").trim();
    }
  } catch {
    text = "";
  }
  deps.budget?.settle(granted, cost);
  return text ? `${text} ${figures(s)}` : fallbackSummary(s);
}
