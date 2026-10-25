/**
 * Resume Haiku de fin de phase pour le panneau de la boucle.
 *
 * Quoi : 1-2 phrases (agents en cours, avancement), plafond 0.05 USD, 1 tour, sans outil;
 *        cout regle dans le budget partage.
 * Pourquoi : ne jamais bloquer la boucle: au moindre echec (query, jeton, budget, reponse vide)
 *        on renvoie un resume deterministe sans LLM.
 * Usage : `await summarizePhase(state, { query, budget, env })` -> chaine.
 */
import type { Budget } from "./budget";
import { MODEL_BY_KIND, type QueryFn } from "./research";

/** Etat d'une phase ou d'un agent. */
export type Status = "pending" | "running" | "ok" | "failed";

/** Photographie de la boucle au moment du resume. */
export interface PhaseState {
  phase: string;
  phases: { name: string; status: Status }[];
  agents: { name: string; status: Status; costUsd?: number; note?: string }[];
  spentUsd: number;
  remainingUsd: number;
}

/** Dependances: query injectee, budget partage, env (jeton OAuth) optionnels. */
export interface SummaryDeps {
  query: QueryFn;
  budget?: Budget;
  env?: Record<string, string>;
}

/** Plafond d'un resume (USD). */
export const SUMMARY_CAP_USD = 0.05;

/** Resume sans LLM: phases terminees puis en cours. */
export function fallbackSummary(s: PhaseState): string {
  const names = (st: Status) => s.phases.filter((p) => p.status === st).map((p) => p.name).join(", ");
  const done = names("ok"), failed = names("failed"), run = names("running");
  const parts = [done && `Terminé : ${done}.`, failed && `Échec : ${failed}.`, run && `En cours : ${run}.`].filter(Boolean);
  return parts.length ? parts.join(" ") : "Aucune phase démarrée.";
}

/** Resume de la phase; ne leve jamais. */
export async function summarizePhase(s: PhaseState, deps: SummaryDeps): Promise<string> {
  if (deps.env && !deps.env.CLAUDE_CODE_OAUTH_TOKEN) return fallbackSummary(s);
  if (deps.budget?.exhausted()) return fallbackSummary(s);
  const granted = deps.budget ? deps.budget.reserve(SUMMARY_CAP_USD) : SUMMARY_CAP_USD;
  if (granted <= 0) return fallbackSummary(s);
  let cost = 0;
  let text = "";
  try {
    const prompt =
      "Resume en francais, en 1 a 2 phrases COURTES, ce que font les agents et ou en est la boucle. " +
      `Pas de markdown.\nEtat: ${JSON.stringify(s)}`;
    const stream = deps.query({
      prompt,
      options: {
        model: MODEL_BY_KIND.summary, maxTurns: 1, maxBudgetUsd: granted, tools: [], allowedTools: [],
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
  return text || fallbackSummary(s);
}
