/**
 * Secteur recherche de la boucle : 4 axes en parallele, synthese ecrite dans le worktree.
 * Usage : `researchSector(write)` -> `Sector` (voir pipeline.ts).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AXES, runResearch } from "./research";
import { mergeDoc, namesOf } from "./researchMerge";
import { toController, type Sector } from "./sectors";

/** Fichier de synthese de la recherche (relatif au worktree). */
export const DOC = join("docs", "recherche", "fonctionnalites.md");

/** Lecture disque par defaut: `null` si le fichier n'existe pas. */
const diskRead = (path: string): string | null => { try { return readFileSync(path, "utf-8"); } catch { return null; } };

/** Titres des idees d'une synthese (puces `- **Nom** : ...`), pour la consigne. */
const titlesOf = (md: string | null): string[] => [...(md ?? "").matchAll(/^\s*[-*] \*\*(.+?)\*\*/gm)].map((m) => m[1]);

/** Construit le secteur recherche; `write` ecrit le fichier de synthese, `read` lit l'ancienne (cache des idees deja trouvees). */
export function researchSector(write: (path: string, text: string) => void, read: (path: string) => string | null = diskRead): Sector {
  return {
    name: "research" as Sector["name"],
    async run(ctx) {
      const t0 = Date.now();
      ctx.emit({ type: "start", sector: "research" });
      const old = read(join(ctx.dir, DOC));
      const out = await runResearch({
        query: ctx.query, budget: ctx.budget, env: ctx.env, cwd: ctx.dir, abort: toController(ctx.signal),
        emit: ctx.emit, models: ctx.models, known: namesOf(old), knownTitles: titlesOf(old),
      });
      write(join(ctx.dir, DOC), mergeDoc(old, out.items, AXES)); // les idees precedentes ne sont jamais perdues
      ctx.emit({
        type: "end", sector: "research", costUsd: out.totalCostUsd, elapsedS: Math.round((Date.now() - t0) / 1000),
        totalUsd: ctx.budget.spent(), remainingUsd: ctx.budget.left(),
      });
    },
  };
}
