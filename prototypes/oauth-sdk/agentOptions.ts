/**
 * Options Agent SDK communes aux requetes de la boucle (une seule source de verite).
 *
 * Quoi : `agentOptions(mode, over)` renvoie les options d'une requete `query()`.
 * Pourquoi : la boucle ne doit ni appauvrir ni changer Claude Code. On garde donc le jeu d'outils
 *        complet (`tools: preset claude_code` : Skill, Agent, MCP, web...), tous les skills
 *        (`skills: "all"`, sources user + project) et le prompt systeme du preset. Seules les
 *        ecritures git sont interdites (la boucle gere branches et fusions). Aucun `tools: [..]` ferme.
 * Modes : `research` (lecture + web + skills, aucune edition), `edit` (edition + shell, tests),
 *        `helper` (un tour, aucun outil: resumes optionnels, sans demarrage de skills ni reglages).
 * Cache : `excludeDynamicSections` deplace le contexte propre a la session dans le premier message,
 *        donc les requetes paralleles (4 axes) partagent le meme prefixe de prompt en cache.
 * Usage : `agentOptions("edit", { cwd, maxBudgetUsd, abort, env, model, maxTurns })`.
 */

import { modelFor } from "./routing";

/** Type de tache d'une requete : code (edition pure), think (recherche, choix, diagnostic, design), plan (arbitrage), summary. */
export type Kind = "code" | "think" | "plan" | "summary";

/** Modele par type de tache (seul endroit ou les modeles sont nommes). */
export const MODEL_BY_KIND: Record<Kind, string> = { code: "haiku", think: "sonnet", plan: "opus", summary: "haiku" };

/** Sous-agent d'arbitrage: l'agent principal ne pose jamais de question a l'utilisateur, il l'appelle. */
const TRANCHEUR = {
  description: "A appeler au moindre doute ou a la place de toute question a l'utilisateur : tranche et renvoie une decision unique.",
  prompt:
    "Tu es l'agent de questionnement et de raisonnement. On te soumet une question ou un doute. " +
    "Lis le code et CLAUDE.md si utile, pese les options (simplicite, regles du projet, TDD, pas de surcharge), " +
    "puis rends UNE decision claire en 3 lignes maximum : choix, raison, consequence. Ne pose jamais de question en retour.",
  model: modelFor("trancheur", 0),
  tools: ["Read", "Grep", "Glob", "WebSearch", "WebFetch"],
  maxTurns: 8,
};

/** Ecritures git interdites aux agents. */
export const NO_GIT = ["push", "checkout", "switch", "merge", "branch", "reset", "rebase", "commit"].map(
  (c) => `Bash(git ${c}:*)`,
);

/** Outils en lecture seule, web et extensions (pre-approuves partout). */
const READ = ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Skill", "Agent", "TodoWrite"];
/** Outils d'edition et de shell (mode `edit`). */
const EDIT = ["Edit", "Write", "Bash", "NotebookEdit"];

/** Modes d'une requete. */
export type Mode = "research" | "edit" | "helper";

/** Reglages propres a la requete. */
export interface Over {
  cwd?: string;
  maxBudgetUsd?: number;
  abort?: AbortController;
  env?: Record<string, string>;
  model?: string;
  maxTurns?: number;
}

/** Options `query()` pour un mode, plus les reglages de la requete. */
export function agentOptions(mode: Mode, o: Over = {}): Record<string, unknown> {
  const base = {
    model: o.model, maxTurns: o.maxTurns, maxBudgetUsd: o.maxBudgetUsd, env: o.env, cwd: o.cwd,
    abortController: o.abort, permissionMode: "dontAsk",
  };
  if (mode === "helper") {
    return { ...base, maxTurns: o.maxTurns ?? 1, tools: [], allowedTools: [], settingSources: [] };
  }
  return {
    ...base,
    tools: { type: "preset", preset: "claude_code" },
    skills: "all",
    settingSources: ["user", "project"],
    allowedTools: mode === "edit" ? [...READ, ...EDIT] : READ,
    disallowedTools: [...NO_GIT, "AskUserQuestion"],
    agents: { trancheur: TRANCHEUR },
    systemPrompt: { type: "preset", preset: "claude_code", excludeDynamicSections: true },
  };
}
