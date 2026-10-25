/**
 * Rôle audit: prompt court + schéma JSON des findings. L'orchestrateur lance
 * lui-même les vérifications (voir checks.ts) et ne transmet que les échecs,
 * tronqués à 100 lignes. Tout finding sans `repro` est rejeté.
 */
import type { AgentRunner } from "../agent";

/** Résultat d'une vérification (npm test, tsc…). */
export interface CheckResult {
  name: string;
  ok: boolean;
  output: string;
}

/** Problème trouvé par l'audit. */
export interface Finding {
  file: string;
  symptom: string;
  severity: "low" | "medium" | "high";
  repro: string;
  confidence: number;
}

/** Schéma JSON de la sortie de l'agent. */
export const AUDIT_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          file: { type: "string" },
          symptom: { type: "string" },
          severity: { enum: ["low", "medium", "high"] },
          repro: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["file", "symptom", "severity", "repro", "confidence"],
      },
    },
  },
  required: ["findings"],
};

const MAX_LINES = 100;

/** Garde les 100 premières lignes. */
export function truncateLines(text: string, max = MAX_LINES): string {
  const lines = text.split("\n");
  return lines.length <= max ? text : lines.slice(0, max).join("\n") + "\n[…tronqué]";
}

/** Prompt d'audit: seuls les échecs sont inclus. */
export function buildAuditPrompt(checks: CheckResult[]): string {
  const fails = checks.filter((c) => !c.ok).map((c) => `## ${c.name}\n${truncateLines(c.output)}`);
  return (
    "Audit en lecture seule du dépôt. Trouve de vrais bugs (correction, sécurité). " +
    "Chaque finding DOIT avoir une procédure `repro` concrète; sinon ne le signale pas.\n" +
    (fails.length ? `Échecs observés:\n${fails.join("\n")}` : "Aucun échec de test/tsc.")
  );
}

/** Valide la sortie: ignore les findings mal formés ou sans repro. */
export function parseFindings(output: unknown): Finding[] {
  const list = (output as { findings?: unknown } | null)?.findings;
  if (!Array.isArray(list)) return [];
  return list.filter((f): f is Finding => {
    const o = f as Record<string, unknown> | null;
    return (
      !!o && typeof o.file === "string" && typeof o.symptom === "string" &&
      (o.severity === "low" || o.severity === "medium" || o.severity === "high") &&
      typeof o.repro === "string" && o.repro.trim() !== "" && typeof o.confidence === "number"
    );
  });
}

/** Lance l'audit via le runner et renvoie les findings valides. */
export async function runAudit(runner: AgentRunner, checks: CheckResult[]): Promise<Finding[]> {
  const r = await runner.run({ role: "audit", prompt: buildAuditPrompt(checks), schema: AUDIT_SCHEMA });
  return r.ok ? parseFindings(r.output) : [];
}
