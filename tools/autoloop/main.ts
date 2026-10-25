/**
 * Point d'entrée de la boucle autonome.
 * Usage: `npx tsx tools/autoloop/main.ts [--dry-run] [--live] [--env-file .env]`.
 * Défaut `--dry-run`: agents et GitHub factices, aucun appel réel, aucune écriture `gh`.
 * `--live`: un cycle réel (SDK + gh, création d'issues), voir live.ts; ne pas lancer sans accord.
 * Les secrets ne sont jamais affichés.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { FakeAgentRunner, type AgentRunner } from "./agent";
import { Budget } from "./budget";
import { DEFAULT_CONFIG, type Role } from "./config";
import { runCycle, trackedRunner } from "./cycle";
import { FakeGhClient, type GhClient } from "./github";
import { Journal } from "./journal";
import { runLive } from "./live";
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
  gh?: GhClient;
}

/** Rôle d'agent utilisé par chaque action (hors audit, géré par `runCycle`). */
const ACTION_ROLE: Partial<Record<Action["kind"], Role>> = {
  "fix-bug": "worker", feature: "worker", research: "researcher", "handle-prs": "reviewer",
};

/** Finding fictif renvoyé par l'audit factice par défaut. */
const SAMPLE = { file: "src/sample.ts", symptom: "sim", severity: "low", repro: "sim", confidence: 1 };

/** Boucle simulée: état fictif, agents et GitHub factices (aucune création); renvoie actions et raison d'arrêt. */
export async function runDry(d: DryDeps): Promise<{ reason: string; actions: string[] }> {
  const cfg = DEFAULT_CONFIG;
  const runner = d.runner ?? new FakeAgentRunner([{ output: { findings: [SAMPLE] } }]);
  const gh = d.gh ?? new FakeGhClient();
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
    if (role) await trackedRunner(runner, budget, journal, st.iteration).run({ role, prompt: `[dry-run] ${act.kind}` });
    if (act.kind === "audit") {
      const r = await runCycle({ runner, gh, cfg, budget, journal, cycle: st.iteration, live: false, checks: async () => [] });
      d.log(`[dry-run] audit: ${r.findings} findings, ${r.wouldCreate.length} issues (non créées)`);
      st.lastAuditSha = st.masterSha;
      st.bugQueue = r.wouldCreate.length;
      st.idleCycles = 0;
    } else if (act.kind === "fix-bug") { st.bugQueue--; st.openPrs++; }
    else if (act.kind === "handle-prs") st.openPrs = 0;
    else if (act.kind === "idle") st.idleCycles++;
  }
}

/** Entrée CLI. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = { ...process.env, ...(args.envFile ? loadEnvFile(args.envFile) : {}) };
  const log = (l: string): void => console.log(redact(l, env));
  const append = (l: string): void => appendFileSync("tools/autoloop/runs.jsonl", l);
  if (!args.dryRun) {
    await runLive(env, append, log);
    return;
  }
  const r = await runDry({ stopFile: () => existsSync("tools/autoloop/STOP"), log, append });
  log(`terminé: ${r.reason} (${r.actions.length} actions)`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("autoloop/main.ts")) void main();
