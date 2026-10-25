/**
 * Suivi du budget: cumule coût, tokens et nombre d'appels.
 * Le coût OAuth est indicatif: le plafond d'appels est le garde-fou fiable.
 */

/** Consommation d'un appel. */
export interface Usage {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

/** Limites du budget. */
export interface BudgetLimits {
  budgetUsd: number;
  maxCalls: number;
}

/** Cumul courant. */
export interface BudgetSnapshot {
  costUsd: number;
  tokens: number;
  calls: number;
}

/** Compteur de budget global. */
export class Budget {
  private costUsd = 0;
  private tokens = 0;
  private calls = 0;

  constructor(private readonly limits: BudgetLimits) {}

  /** Enregistre un appel terminé. */
  record(u: Usage): void {
    this.costUsd += u.costUsd;
    this.tokens += u.inputTokens + u.outputTokens;
    this.calls += 1;
  }

  /** Vrai tant que ni le coût ni le nombre d'appels n'ont atteint leur plafond. */
  canContinue(): boolean {
    return this.costUsd < this.limits.budgetUsd && this.calls < this.limits.maxCalls;
  }

  /** Copie du cumul. */
  snapshot(): BudgetSnapshot {
    return { costUsd: this.costUsd, tokens: this.tokens, calls: this.calls };
  }
}
