/**
 * Point d'entrée de la boucle autonome (étape 1: squelette).
 * Usage: `npx tsx tools/autoloop/main.ts [--dry-run] [--live] [--env-file .env]`.
 * Défaut `--dry-run`: agents factices, aucun appel réel, aucun `gh` en écriture.
 * `--live` n'est pas encore branché (étapes suivantes). Les secrets ne sont jamais affichés.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { FakeAgentRunner, type AgentRunner } from "./agent";
import { Budget } from "./budget";
import { DEFAULT_CONFIG, type Role } from "./config";
import { Journal } from "./journal";
import { nextAction, type Action, type LoopState } from "./loop";
import { redact } from "./redact";

/** Arguments CLI. */
export interface Args {
  dryRun: boolean;
  envFile?: string;
}

/** Analyse les arguments; dry-run par défaut, `--live` le désactive. */
export function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--live") a.dryRun = false;
    else if (argv[i] === "--dry-run") a.dryRun = true;
    else if (argv[i] === "--env-file") a.envFile = argv[++i];
  }
  return a;
}

/** Charge un fichier `KEY=VALUE` dans un objet (valeurs jamais affichées). */
export function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

/** Dépendances injectables du dry-run. */
export interface DryDeps {
  stopFile: () => boolean;
  log: (line: string) => void;
  append: (line: string) => void;
  runner?: AgentRunner;
}

/** Rôle d'agent utilisé par chaque action. */
const ACTION_ROLE: Partial<Record<Action["kind"], Role>> = {
  audit: "audit", "fix-bug": "worker", feature: "worker", research: "researcher", "handle-prs": "reviewer",
};

/** Boucle simulée: état fictif, agents factices; renvoie les actions et la raison d'arrêt. */
export async function runDry(d: DryDeps): Promise<{ reason: string; actions: string[] }> {
  const cfg = DEFAULT_CONFIG;
  const runner = d.runner ?? new FakeAgentRunner();
  const budget = new Budget(cfg);
  const journal = new Journal(d.append);
  const st: LoopState = {
    stopFile: false, budgetOk: true, iteration: 0, idleCycles: 0, openPrs: 0, bugQueue: 0,
    masterSha: "sim-1", lastAuditSha: "", featureBacklog: 0, researchDue: false,
  };
  const actions: string[] = [];
  for (;;) {
    st.stopFile = d.stopFile();
    st.budgetOk = budget.canContinue();
    const act = nextAction(st, cfg);
    if (act.kind === "stop") {
      d.log(`stop: ${act.reason}`);
      return { reason: act.reason, actions };
    }
    actions.push(act.kind);
    d.log(`[dry-run] ${act.kind}`);
    st.iteration++;
    const role = ACTION_ROLE[act.kind];
    if (role) {
      const r = await runner.run({ role, prompt: `[dry-run] ${act.kind}` });
      budget.record(r);
      journal.append({
        ts: new Date().toISOString(), cycle: st.iteration, role, model: r.model, inputTokens: r.inputTokens,
        outputTokens: r.outputTokens, cacheRead: r.cacheRead, costUsd: r.costUsd, turns: r.turns,
        durationMs: r.durationMs, result: r.ok ? "ok" : "error",
      });
    }
    // Simulation: l'audit trouve un bug, le fix ouvre une PR, la PR est traitée.
    if (act.kind === "audit") { st.lastAuditSha = st.masterSha; st.bugQueue = 1; st.idleCycles = 0; }
    else if (act.kind === "fix-bug") { st.bugQueue--; st.openPrs++; }
    else if (act.kind === "handle-prs") st.openPrs = 0;
    else if (act.kind === "idle") st.idleCycles++;
  }
}

/** Entrée CLI. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = { ...process.env, ...(args.envFile ? loadEnvFile(args.envFile) : {}) };
  if (!args.dryRun) {
    console.error("--live non implémenté (étape 1: dry-run uniquement)");
    process.exit(1);
  }
  const stopPath = "tools/autoloop/STOP";
  const r = await runDry({
    stopFile: () => existsSync(stopPath),
    log: (l) => console.log(redact(l, env)),
    append: (l) => appendFileSync("tools/autoloop/runs.jsonl", l),
  });
  console.log(`terminé: ${r.reason} (${r.actions.length} actions)`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("autoloop/main.ts")) void main();
