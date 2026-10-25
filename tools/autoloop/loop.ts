/**
 * Ordonnancement PUR de la boucle: `nextAction(state, config)` choisit la
 * prochaine action selon la priorité garde-fous > PR ouvertes > bugs > audit >
 * features > R&D. Aucun effet de bord, aucune E/S.
 */
import type { Config } from "./config";

/** Photographie de l'état de la boucle. */
export interface LoopState {
  /** Le fichier STOP existe. */
  stopFile: boolean;
  /** `Budget.canContinue()`. */
  budgetOk: boolean;
  iteration: number;
  /** Cycles consécutifs sans nouveauté. */
  idleCycles: number;
  openPrs: number;
  bugQueue: number;
  masterSha: string;
  lastAuditSha: string;
  featureBacklog: number;
  /** R&D due (rare, décidé par l'appelant). */
  researchDue: boolean;
}

/** Raison d'arrêt. */
export type StopReason = "stop-file" | "budget" | "iterations" | "idle";

/** Action choisie. */
export type Action =
  | { kind: "stop"; reason: StopReason }
  | { kind: "handle-prs" | "fix-bug" | "audit" | "feature" | "research" | "idle" };

/** Critères d'arrêt, ou null. */
export function stopReason(s: LoopState, cfg: Config): StopReason | null {
  if (s.stopFile) return "stop-file";
  if (!s.budgetOk) return "budget";
  if (s.iteration >= cfg.maxIterations) return "iterations";
  if (s.idleCycles >= cfg.idleCyclesStop) return "idle";
  return null;
}

/** Prochaine action (voir ordre de priorité en tête de fichier). */
export function nextAction(s: LoopState, cfg: Config): Action {
  const reason = stopReason(s, cfg);
  if (reason) return { kind: "stop", reason };
  if (s.openPrs > 0) return { kind: "handle-prs" };
  if (s.bugQueue > 0) return { kind: "fix-bug" };
  if (s.masterSha !== s.lastAuditSha) return { kind: "audit" };
  if (s.featureBacklog > 0) return { kind: "feature" };
  if (s.researchDue) return { kind: "research" };
  return { kind: "idle" };
}
