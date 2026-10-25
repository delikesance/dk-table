/**
 * USD budget guard for the query loop: parallel-safe reservations, real-cost
 * settlement, and a 90% exhaustion threshold. Synchronous, so no races.
 */

/** Budget tracker shared by concurrent queries. */
export interface Budget {
  /** Reserve up to `want` USD for one query; returns the amount granted (0 if exhausted). Parallel-safe: sum of grants in flight never exceeds remaining. */
  reserve(want: number): number;
  /** Settle a reservation: release `granted`, record real `cost` (cost may be < or slightly > granted). */
  settle(granted: number, cost: number): void;
  spent(): number;
  /** Remaining USD, excluding in-flight reservations. */
  remaining(): number;
  /** Plafond total (USD). */
  cap(): number;
  /** Reste a depenser (USD) = plafond - depense, reservations en vol comprises: sert a l'affichage (ne saute pas). */
  left(): number;
  /** Taux EUR -> USD utilise (pour afficher en euros). */
  readonly eurUsd: number;
  /** True once spent+reserved >= 90% of cap. */
  exhausted(): boolean;
}

/** Create a budget from a cap in EUR, converted to USD at `eurUsd`. */
export function createBudget(
  budgetEur: number,
  eurUsd = Number(process.env.EUR_USD) || 1.08,
): Budget {
  const cap = budgetEur * eurUsd;
  let spent = 0;
  let reserved = 0;
  const free = () => Math.max(0, cap - spent - reserved);
  return {
    reserve(want) {
      const granted = Math.max(0, Math.min(want, free()));
      reserved += granted;
      return granted;
    },
    settle(granted, cost) {
      reserved = Math.max(0, reserved - granted);
      spent += cost;
    },
    cap: () => cap,
    left: () => Math.max(0, cap - spent),
    eurUsd,
    spent: () => spent,
    remaining: free,
    exhausted: () => spent + reserved >= cap * 0.9 - 1e-12,
  };
}

/** Parse a budget in EUR; throws on NaN, <= 0 or > 100. */
export function parseBudgetEur(v: unknown): number {
  const n = typeof v === "string" && v.trim() === "" ? NaN : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100) {
    throw new Error(`Invalid budget (EUR, 0 < x <= 100): ${String(v)}`);
  }
  return n;
}
