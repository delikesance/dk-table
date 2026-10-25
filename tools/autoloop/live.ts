/**
 * Mode `--live` (étape 2): un cycle d'audit réel -> dédoublonnage -> création d'issues.
 * Branche `SdkAgentRunner`, `RealGhClient` et les vérifications npm/tsc réelles.
 * Ce module n'est jamais exécuté par les tests.
 */
import { SdkAgentRunner } from "./agent";
import { Budget } from "./budget";
import { makeChecks } from "./checks";
import { DEFAULT_CONFIG } from "./config";
import { runCycle } from "./cycle";
import { RealGhClient } from "./github";
import { Journal } from "./journal";

/** Lance un cycle réel; `env` doit contenir CLAUDE_CODE_OAUTH_TOKEN (jamais affiché). */
export async function runLive(
  env: Record<string, string | undefined>,
  append: (line: string) => void,
  log: (line: string) => void,
): Promise<void> {
  if (!env.CLAUDE_CODE_OAUTH_TOKEN) throw new Error("CLAUDE_CODE_OAUTH_TOKEN absent (--env-file)");
  const cfg = DEFAULT_CONFIG;
  const r = await runCycle({
    runner: new SdkAgentRunner(cfg, env), gh: new RealGhClient(), cfg, budget: new Budget(cfg),
    journal: new Journal(append, env), cycle: 1, live: true, checks: makeChecks(),
  });
  log(`cycle: ${r.findings} findings, ${r.skipped} ignorés, issues créées: ${r.created.join(", ") || "aucune"}`);
}
