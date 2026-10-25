/**
 * Secteur recherche de la boucle : 4 axes en parallele, synthese ecrite dans le worktree.
 * Usage : `researchSector(write)` -> `Sector` (voir pipeline.ts).
 */
import { join } from "node:path";
import { runResearch } from "./research";
import { toController, type Sector } from "./sectors";

/** Fichier de synthese de la recherche (relatif au worktree). */
export const DOC = join("docs", "recherche", "fonctionnalites.md");

/** Construit le secteur recherche; `write` ecrit le fichier de synthese. */
export function researchSector(write: (path: string, text: string) => void): Sector {
  return {
    name: "research" as Sector["name"],
    async run(ctx) {
      const t0 = Date.now();
      ctx.emit({ type: "start", sector: "research" });
      const out = await runResearch({
        query: ctx.query, budget: ctx.budget, env: ctx.env, cwd: ctx.dir, abort: toController(ctx.signal),
        emit: ctx.emit,
        log: (message) => ctx.emit({ type: "info", sector: "research", message }),
      });
      write(join(ctx.dir, DOC), out.markdown);
      ctx.emit({
        type: "end", sector: "research", costUsd: out.totalCostUsd, elapsedS: Math.round((Date.now() - t0) / 1000),
        totalUsd: ctx.budget.spent(), remainingUsd: ctx.budget.remaining(),
      });
    },
  };
}
