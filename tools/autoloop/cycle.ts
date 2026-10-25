/**
 * Cycle d'audit complet: vérifications -> audit -> dédoublonnage -> création d'issues.
 * Budget et journal sont appliqués à chaque appel d'agent (`trackedRunner`).
 * La création `gh` n'a lieu qu'avec `live: true`; sinon on liste `wouldCreate`.
 */
import type { AgentRunner } from "./agent";
import type { Budget } from "./budget";
import type { ChecksFn } from "./checks";
import type { Config } from "./config";
import { dedupe, fingerprint, marker } from "./dedupe";
import type { GhClient } from "./github";
import type { Journal } from "./journal";
import { runAudit, type Finding } from "./roles/audit";

/** Enveloppe un runner pour enregistrer chaque appel (budget + journal). */
export function trackedRunner(inner: AgentRunner, budget: Budget, journal: Journal, cycle: number): AgentRunner {
  return {
    async run(req) {
      const r = await inner.run(req);
      budget.record(r);
      journal.append({
        ts: new Date().toISOString(), cycle, role: req.role, model: r.model, inputTokens: r.inputTokens,
        outputTokens: r.outputTokens, cacheRead: r.cacheRead, costUsd: r.costUsd, turns: r.turns,
        durationMs: r.durationMs, result: r.ok ? "ok" : "error",
      });
      return r;
    },
  };
}

/** Dépendances d'un cycle. */
export interface CycleDeps {
  runner: AgentRunner;
  gh: GhClient;
  cfg: Config;
  budget: Budget;
  journal: Journal;
  cycle: number;
  live: boolean;
  checks: ChecksFn;
}

/** Bilan d'un cycle. */
export interface CycleResult {
  findings: number;
  skipped: number;
  wouldCreate: Finding[];
  /** Numéros d'issues créées (live uniquement). */
  created: number[];
}

/** Corps d'issue: détails + marqueur d'empreinte. */
function issueBody(f: Finding): string {
  return `**Fichier**: \`${f.file}\`\n**Gravité**: ${f.severity} (confiance ${f.confidence})\n\n**Symptôme**: ${f.symptom}\n\n**Repro**:\n${f.repro}\n\n${marker(fingerprint(f.file, f.symptom))}`;
}

/** Exécute un cycle d'audit. */
export async function runCycle(d: CycleDeps): Promise<CycleResult> {
  const res: CycleResult = { findings: 0, skipped: 0, wouldCreate: [], created: [] };
  if (!d.budget.canContinue()) return res;
  const runner = trackedRunner(d.runner, d.budget, d.journal, d.cycle);
  const findings = await runAudit(runner, await d.checks());
  res.findings = findings.length;
  const { fresh, skipped } = await dedupe(findings, d.gh, runner);
  res.skipped = skipped.length;
  res.wouldCreate = fresh.slice(0, d.cfg.maxIssuesPerCycle);
  if (!d.live) return res;
  for (const f of res.wouldCreate) {
    res.created.push(await d.gh.createIssue(`[auto] ${f.file}: ${f.symptom}`.slice(0, 120), issueBody(f), ["auto:bug"]));
  }
  return res;
}
