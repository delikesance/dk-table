/**
 * Journal JSONL des appels d'agent (`runs.jsonl`) et résumé par cycle.
 * L'écriture est injectée (fichier en prod, tableau en test); tout est masqué par `redact`.
 */
import { redact } from "./redact";
import type { Role } from "./config";

/** Une ligne du journal. */
export interface RunEntry {
  ts: string;
  cycle: number;
  role: Role;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  costUsd: number;
  turns: number;
  durationMs: number;
  /** "ok", "error" ou texte court. */
  result: string;
}

/** Résumé d'un cycle. */
export interface CycleSummary {
  cycle: number;
  calls: number;
  costUsd: number;
  tokens: number;
  cacheRead: number;
  errors: number;
  durationMs: number;
}

/** Écrivain de lignes JSONL (chaque ligne finit par un saut de ligne). */
export class Journal {
  constructor(
    private readonly write: (line: string) => void,
    private readonly env: Record<string, string | undefined> = {},
  ) {}

  /** Ajoute une entrée, secrets masqués. */
  append(e: RunEntry): void {
    this.write(redact(JSON.stringify(e), this.env) + "\n");
  }
}

/** Agrège les entrées d'un cycle. */
export function summarize(entries: RunEntry[], cycle: number): CycleSummary {
  const s: CycleSummary = { cycle, calls: 0, costUsd: 0, tokens: 0, cacheRead: 0, errors: 0, durationMs: 0 };
  for (const e of entries) {
    if (e.cycle !== cycle) continue;
    s.calls += 1;
    s.costUsd += e.costUsd;
    s.tokens += e.inputTokens + e.outputTokens;
    s.cacheRead += e.cacheRead;
    s.durationMs += e.durationMs;
    if (e.result === "error") s.errors += 1;
  }
  return s;
}
