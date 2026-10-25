/**
 * Table de routage tache -> modele : toujours le plus petit modele suffisant, repli vers un plus gros apres echec.
 *
 * Pourquoi : Haiku des que la tache est simple (resume, arbitrage, petite correction, premiere passe d'implementation),
 *        Sonnet pour ce qui exige du raisonnement (recherche, design), Opus seulement en dernier recours.
 *        Un echec (agent en erreur, ou validation par code qui refuse: tests rouges, rapport sans preuves) monte d'un cran.
 * Config : `BOUCLE_MODELS='{"implementation":["sonnet","opus"]}'` remplace la chaine d'une tache.
 * Usage : `modelFor("implementation", tentative, parseOverride(env.BOUCLE_MODELS))`.
 */

/** Taches routees. */
export type Task = "research" | "design" | "implementation" | "correction" | "summary" | "trancheur";

/** Chaines par defaut, du plus petit au plus gros. */
export const ROUTES: Record<Task, string[]> = {
  research: ["sonnet", "opus"],
  design: ["sonnet", "opus"],
  implementation: ["haiku", "sonnet", "opus"],
  correction: ["haiku", "sonnet", "opus"],
  summary: ["haiku"],
  trancheur: ["haiku", "sonnet"],
};

/** Poids de cout relatifs (ordre de grandeur des tarifs): sert a mesurer avant/apres, pas a facturer. */
export const WEIGHT: Record<string, number> = { haiku: 1, sonnet: 3, opus: 15 };

/** Lit `BOUCLE_MODELS`; JSON invalide, taches inconnues et chaines vides sont ignores. */
export function parseOverride(raw?: string): Partial<Record<Task, string[]>> {
  const out: Partial<Record<Task, string[]>> = {};
  try {
    const j = JSON.parse(raw ?? "");
    for (const t of Object.keys(ROUTES) as Task[]) {
      const c = j?.[t];
      if (Array.isArray(c) && c.length && c.every((m) => typeof m === "string")) out[t] = c;
    }
  } catch { /* ignore */ }
  return out;
}

/** Modele de la tache a la tentative `attempt` (0 = premiere): monte d'un cran par echec, plafonne au dernier. */
export function modelFor(task: Task, attempt: number, override: Partial<Record<Task, string[]>> = {}): string {
  const chain = override[task] ?? ROUTES[task];
  return chain[Math.max(0, Math.min(attempt, chain.length - 1))];
}

/** Cout relatif d'une liste d'appels. */
export const costUnits = (models: string[]): number => models.reduce((n, m) => n + (WEIGHT[m] ?? 1), 0);
