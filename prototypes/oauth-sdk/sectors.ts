/**
 * Secteurs de la boucle autres que la recherche : implementation, correction, design.
 *
 * Quoi : definition de chaque secteur (prompt, modele, outils) + `runSector`, une requete
 *        Agent SDK avec `query` injectee (testable sans reseau).
 * Pourquoi : les agents editent et lancent les tests mais ne touchent jamais a git
 *        (branches, commits et fusions sont faits par la boucle, pas par l'agent).
 * Usage : `runSector(SECTORS[0], { query, maxBudgetUsd, env, log })` -> `{ costUsd, ok, text }`.
 */
import type { Budget } from "./budget";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

/** Definition d'un secteur (prompt et outils). */
export interface SectorDef {
  id: "implementation" | "correction" | "design";
  model: string;
  prompt: string;
  maxTurns: number;
  /** Part du plafond total reservee a ce secteur. */
  share: number;
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

/** Definitions des trois secteurs, dans l'ordre d'execution. */
export const SECTOR_DEFS: SectorDef[] = [
  {
    id: "implementation", model: "sonnet", maxTurns: 60, share: 0.4, tools: EDIT, allowedTools: [...EDIT.slice(0, 5), ...RUN], disallowedTools: NO_GIT,
    prompt:
      "Secteur implementation. Lis docs/recherche/fonctionnalites.md et TODO.md, choisis 1 a 3 " +
      "fonctionnalites non cochees, prioritaires et petites, et implemente-les. " + RULES,
  },
  {
    id: "correction", model: "sonnet", maxTurns: 40, share: 0.2, tools: EDIT, allowedTools: [...EDIT.slice(0, 5), ...RUN], disallowedTools: NO_GIT,
    prompt:
      "Secteur correction. Lance `npm test` puis `npx tsc --noEmit`. Pour chaque echec ou erreur de " +
      "type, ecris un test qui reproduit le bug, puis corrige le code (jamais en affaiblissant un " +
      "test existant). Repete jusqu'a ce que tout soit vert. " + RULES,
  },
  {
    id: "design", model: "sonnet", maxTurns: 40, share: 0.15, tools: EDIT, allowedTools: [...EDIT.slice(0, 5), ...RUN], disallowedTools: NO_GIT,
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
  /** Dossier de travail de l'agent (worktree du secteur). */
  cwd?: string;
}

/** Execute un secteur: une requete, cout lu sur le message `result`. */
export async function runSector(
  s: SectorDef,
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
      permissionMode: "dontAsk", settingSources: ["project"], env: o.env, abortController: o.abort, cwd: o.cwd,
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

/** Contexte fourni par la boucle a un secteur. */
export interface SectorCtx {
  query: QueryFn;
  budget: Budget;
  emit: (e: BoucleEvent) => void;
  /** Worktree du secteur. */
  dir: string;
  signal: AbortSignal;
  env?: Record<string, string>;
}

/** Secteur executable par la boucle. */
export interface Sector {
  name: SectorDef["id"];
  run(ctx: SectorCtx): Promise<void>;
}

/** AbortController relaie depuis un AbortSignal (le SDK attend un controleur). */
export function toController(signal: AbortSignal): AbortController {
  const ac = new AbortController();
  if (signal.aborted) ac.abort();
  else signal.addEventListener("abort", () => ac.abort(), { once: true });
  return ac;
}

/** Passes max par secteur (une seconde seulement si la premiere echoue et qu'il reste du budget). */
const MAX_PASSES = 2;

/** Construit le secteur executable: runSector sous reserve/settle, arret si budget epuise ou abandon. */
function makeSector(d: SectorDef): Sector {
  return {
    name: d.id,
    async run(ctx) {
      const t0 = Date.now();
      const cap = ctx.budget.spent() + ctx.budget.remaining();
      let cost = 0;
      ctx.emit({ type: "start", sector: d.id });
      const abort = toController(ctx.signal);
      for (let i = 0; i < MAX_PASSES && !ctx.signal.aborted && !ctx.budget.exhausted(); i++) {
        const granted = ctx.budget.reserve(cap * d.share);
        if (granted <= 0) break;
        const r = await runSector(d, { query: ctx.query, maxBudgetUsd: granted, env: ctx.env, abort, cwd: ctx.dir });
        ctx.budget.settle(granted, r.costUsd);
        cost += r.costUsd;
        if (r.ok) break;
      }
      ctx.emit({
        type: "end", sector: d.id, costUsd: cost, elapsedS: Math.round((Date.now() - t0) / 1000),
        totalUsd: ctx.budget.spent(), remainingUsd: ctx.budget.remaining(),
      });
    },
  };
}

/** Les trois secteurs, dans l'ordre d'execution. */
export const SECTORS: Sector[] = SECTOR_DEFS.map(makeSector);
