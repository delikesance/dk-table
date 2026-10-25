/**
 * Appel d'agent injectable: interface `AgentRunner`, implémentation réelle
 * `SdkAgentRunner` (wrapper `query()` du Claude Agent SDK, chargé à la demande
 * donc absent des tests) et `FakeAgentRunner` pour les tests / le dry-run.
 * Garde-fous SDK: pas de ANTHROPIC_API_KEY, aucun réglage chargé, `dontAsk`,
 * outils limités par rôle.
 */
import type { Config, Role } from "./config";

/** Requête d'agent. */
export interface AgentRequest {
  role: Role;
  prompt: string;
  /** Schéma JSON de la sortie structurée (optionnel). */
  schema?: Record<string, unknown>;
  cwd?: string;
  model?: string;
}

/** Résultat d'un appel. */
export interface AgentResult {
  ok: boolean;
  output: unknown;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  costUsd: number;
  turns: number;
  durationMs: number;
}

/** Exécuteur d'agent (réel ou factice). */
export interface AgentRunner {
  run(req: AgentRequest): Promise<AgentResult>;
}

/** Outils autorisés par rôle (audit et reviewer en lecture seule). */
export const ROLE_TOOLS: Record<Role, string[]> = {
  audit: ["Read", "Grep", "Glob"],
  reviewer: ["Read", "Grep", "Glob", "Bash"],
  researcher: ["Read", "Grep", "Glob", "WebSearch", "WebFetch"],
  worker: ["Read", "Grep", "Glob", "Edit", "Write", "Bash"],
};

/** Modèle par défaut par rôle. */
export const ROLE_MODEL: Record<Role, string> = {
  audit: "haiku",
  reviewer: "sonnet",
  researcher: "haiku",
  worker: "sonnet",
};

/** Options passées à `query()`. */
export interface SdkOptions {
  model: string;
  maxTurns: number;
  maxBudgetUsd: number;
  tools: string[];
  allowedTools: string[];
  permissionMode: "dontAsk";
  settingSources: never[];
  env: Record<string, string>;
}

/** Construit les options SDK d'un rôle; retire ANTHROPIC_API_KEY de l'env transmis. */
export function buildSdkOptions(
  role: Role,
  cfg: Config,
  procEnv: Record<string, string | undefined>,
): SdkOptions {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(procEnv)) if (v !== undefined && k !== "ANTHROPIC_API_KEY") env[k] = v;
  const lim = cfg.roles[role];
  return {
    model: ROLE_MODEL[role],
    maxTurns: lim.maxTurns,
    maxBudgetUsd: lim.maxBudgetUsd,
    tools: ROLE_TOOLS[role],
    allowedTools: ROLE_TOOLS[role],
    permissionMode: "dontAsk",
    settingSources: [],
    env,
  };
}

/** Message `result` du SDK (champs utilisés seulement). */
interface SdkResult {
  type: string;
  subtype?: string;
  result?: string;
  structured_output?: unknown;
  total_cost_usd?: number;
  num_turns?: number;
  duration_ms?: number;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number };
}

/** Implémentation réelle: un appel `query()` consommé jusqu'au message `result`. */
export class SdkAgentRunner implements AgentRunner {
  constructor(
    private readonly cfg: Config,
    private readonly procEnv: Record<string, string | undefined>,
  ) {}

  async run(req: AgentRequest): Promise<AgentResult> {
    // Spécifieur dynamique: le SDK n'est requis qu'à l'exécution réelle.
    const spec = "@anthropic-ai/claude-agent-sdk";
    const sdk = (await import(/* @vite-ignore */ spec)) as { query: (a: unknown) => AsyncIterable<SdkResult> };
    const opts = buildSdkOptions(req.role, this.cfg, this.procEnv);
    const options: Record<string, unknown> = { ...opts, model: req.model ?? opts.model, cwd: req.cwd };
    if (req.schema) options.outputFormat = { type: "json_schema", schema: req.schema };
    let res: SdkResult | undefined;
    for await (const m of sdk.query({ prompt: req.prompt, options })) if (m.type === "result") res = m;
    const u = res?.usage ?? {};
    return {
      ok: res?.subtype === "success",
      output: res?.structured_output ?? res?.result,
      model: options.model as string,
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      costUsd: res?.total_cost_usd ?? 0,
      turns: res?.num_turns ?? 0,
      durationMs: res?.duration_ms ?? 0,
    };
  }
}

/** Exécuteur factice: rejoue des réponses dans l'ordre et enregistre les requêtes. */
export class FakeAgentRunner implements AgentRunner {
  readonly calls: AgentRequest[] = [];

  constructor(private readonly responses: Partial<AgentResult>[] = []) {}

  async run(req: AgentRequest): Promise<AgentResult> {
    this.calls.push(req);
    return {
      ok: true, output: null, model: ROLE_MODEL[req.role], inputTokens: 0, outputTokens: 0,
      cacheRead: 0, costUsd: 0, turns: 1, durationMs: 0, ...this.responses.shift(),
    };
  }
}
