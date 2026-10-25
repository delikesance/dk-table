/**
 * Secteurs de la boucle autres que la recherche : implementation, correction, design.
 *
 * Quoi : definition de chaque secteur (prompt, modele, outils) + `runSector`, une requete
 *        Agent SDK avec `query` injectee (testable sans reseau).
 * Pourquoi : les agents editent et lancent les tests mais ne touchent jamais a git
 *        (branches, commits et fusions sont faits par la boucle, pas par l'agent).
 * Usage : `runSector(SECTORS[0], { query, maxBudgetUsd, env, log })` -> `{ costUsd, ok, text }`.
 */
import type { QueryFn } from "./research";

/** Definition d'un secteur. */
export interface Sector {
  id: "implementation" | "correction" | "design";
  model: string;
  prompt: string;
  maxTurns: number;
  /** Outils disponibles. */
  tools: string[];
  /** Pre-autorises (tout le reste est refuse en dontAsk). */
  allowedTools: string[];
  /** Interdits explicitement, en plus. */
  disallowedTools: string[];
}

const EDIT = ["Read", "Grep", "Glob", "Edit", "Write", "Bash"];
const RUN = ["Bash(npm test:*)", "Bash(npx tsc:*)", "Bash(npx vitest:*)"];
/** Git est interdit aux agents (la boucle gere branches et fusions). */
const NO_GIT = ["push", "checkout", "switch", "merge", "branch", "reset", "rebase", "commit"].map(
  (c) => `Bash(git ${c}:*)`,
);

const RULES =
  "Lis CLAUDE.md d'abord et respecte-le: TDD (ecris un test qui echoue AVANT tout code, " +
  "lance `npm test`), fichiers de 200 lignes max, tout est documente, mets TODO.md a jour. " +
  "Ne touche pas a git (pas de commit, branche, push): la boucle s'en charge. Reponds brievement.";

/** Les trois secteurs, dans l'ordre d'execution. */
export const SECTORS: Sector[] = [
  {
    id: "implementation", model: "sonnet", maxTurns: 60, tools: EDIT, allowedTools: [...EDIT.slice(0, 5), ...RUN], disallowedTools: NO_GIT,
    prompt:
      "Secteur implementation. Lis docs/recherche/fonctionnalites.md et TODO.md, choisis 1 a 3 " +
      "fonctionnalites non cochees, prioritaires et petites, et implemente-les. " + RULES,
  },
  {
    id: "correction", model: "sonnet", maxTurns: 40, tools: EDIT, allowedTools: [...EDIT.slice(0, 5), ...RUN], disallowedTools: NO_GIT,
    prompt:
      "Secteur correction. Lance `npm test` puis `npx tsc --noEmit`. Pour chaque echec ou erreur de " +
      "type, ecris un test qui reproduit le bug, puis corrige le code (jamais en affaiblissant un " +
      "test existant). Repete jusqu'a ce que tout soit vert. " + RULES,
  },
  {
    id: "design", model: "sonnet", maxTurns: 40, tools: EDIT, allowedTools: [...EDIT.slice(0, 5), ...RUN], disallowedTools: NO_GIT,
    prompt:
      "Secteur design/UX. Relis la charte (section Design de CLAUDE.md, src/styles/) et corrige " +
      "1 a 3 ecarts visibles de l'interface (contraste, alignement, theme sombre, accessibilite), " +
      "chacun avec un test (styles.test.ts ou test d'UI). " + RULES,
  },
];

/** Options de `runSector`. */
export interface RunSectorOpts {
  query: QueryFn;
  /** Plafond de cette requete (USD), transmis au SDK. */
  maxBudgetUsd: number;
  env?: Record<string, string>;
  log?: (line: string) => void;
  now?: () => number;
  abort?: AbortController;
}

/** Execute un secteur: une requete, cout lu sur le message `result`. */
export async function runSector(
  s: Sector,
  o: RunSectorOpts,
): Promise<{ costUsd: number; ok: boolean; text: string }> {
  const log = o.log ?? (() => {});
  const now = o.now ?? Date.now;
  const t0 = now();
  log(`[${s.id}] debut (plafond $${o.maxBudgetUsd.toFixed(2)})`);
  let costUsd = 0;
  let ok = false;
  let text = "";
  const stream = o.query({
    prompt: s.prompt,
    options: {
      model: s.model, maxTurns: s.maxTurns, maxBudgetUsd: o.maxBudgetUsd,
      tools: s.tools, allowedTools: s.allowedTools, disallowedTools: s.disallowedTools,
      permissionMode: "dontAsk", settingSources: ["project"], env: o.env, abortController: o.abort,
    },
  });
  for await (const m of stream) {
    if (m.type !== "result") continue;
    costUsd += m.total_cost_usd ?? 0;
    ok = m.subtype === "success";
    text = m.result ?? "";
  }
  log(`[${s.id}] fin $${costUsd.toFixed(2)} ${Math.round((now() - t0) / 1000)}s ${ok ? "ok" : "echec"}`);
  return { costUsd, ok, text };
}
