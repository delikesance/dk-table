/**
 * Plafonds de la boucle autonome (budget, tours, concurrence, PR/issues, arrêt).
 * Valeurs par défaut prudentes; `loadConfig` applique des surcharges partielles.
 */

/** Rôle d'agent. */
export type Role = "audit" | "worker" | "reviewer" | "researcher";

/** Plafonds d'un appel d'agent. */
export interface RoleLimit {
  maxBudgetUsd: number;
  maxTurns: number;
}

/** Configuration complète de la boucle. */
export interface Config {
  /** Budget global en dollars (indicatif en OAuth). */
  budgetUsd: number;
  /** Plafond du nombre d'appels d'agent (le vrai garde-fou en OAuth). */
  maxCalls: number;
  roles: Record<Role, RoleLimit>;
  maxIterations: number;
  concurrency: number;
  /** PR automatiques ouvertes au maximum. */
  maxOpenPrs: number;
  maxIssuesPerCycle: number;
  /** Cycles consécutifs « rien de nouveau » avant arrêt. */
  idleCyclesStop: number;
}

/** Valeurs par défaut. */
export const DEFAULT_CONFIG: Config = {
  budgetUsd: 20,
  maxCalls: 200,
  roles: {
    audit: { maxBudgetUsd: 1.5, maxTurns: 15 },
    worker: { maxBudgetUsd: 2, maxTurns: 30 },
    reviewer: { maxBudgetUsd: 1, maxTurns: 10 },
    researcher: { maxBudgetUsd: 0.5, maxTurns: 8 },
  },
  maxIterations: 50,
  concurrency: 2,
  maxOpenPrs: 3,
  maxIssuesPerCycle: 3,
  idleCyclesStop: 3,
};

/** Surcharge partielle (les rôles se fusionnent champ par champ). */
export type ConfigOverride = Partial<Omit<Config, "roles">> & { roles?: { [R in Role]?: Partial<RoleLimit> } };

/** Fusionne des surcharges sur le défaut, sans le muter. */
export function loadConfig(o: ConfigOverride = {}): Config {
  const roles = { ...DEFAULT_CONFIG.roles };
  for (const r of Object.keys(o.roles ?? {}) as Role[]) roles[r] = { ...roles[r], ...o.roles?.[r] };
  return { ...DEFAULT_CONFIG, ...o, roles };
}
