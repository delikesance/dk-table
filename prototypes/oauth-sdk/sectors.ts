/**
 * Secteurs de la boucle autres que la recherche : design (maquette HTML), implementation, correction.
 *
 * Quoi : definition de chaque secteur (prompt, modele, outils) + `runSector`, une requete
 *        Agent SDK avec `query` injectee (testable sans reseau).
 * Pourquoi : les agents editent et lancent les tests mais ne touchent jamais a git
 *        (branches, commits et fusions sont faits par la boucle, pas par l'agent).
 * Usage : `runSector(SECTORS[0], { query, maxBudgetUsd, env, log })` -> `{ costUsd, ok, text }`.
 */
import { agentOptions, MODEL_BY_KIND, type Kind } from "./agentOptions";
import type { Budget } from "./budget";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

/** Definition d'un secteur (prompt et outils). */
export interface SectorDef {
  id: "implementation" | "correction" | "design";
  /** Une seule requete melange choix et edition: think (sonnet), pas code (haiku). */
  kind: Kind;
  prompt: string;
  maxTurns: number;
  /** Part du plafond total reservee a ce secteur. */
  share: number;
}

const RULES =
  "Lis CLAUDE.md d'abord et respecte-le: TDD (ecris un test qui echoue AVANT tout code, " +
  "lance `npm test`), fichiers de 200 lignes max, tout est documente, mets TODO.md a jour. " +
  "Ne touche pas a git (pas de commit, branche, push): la boucle s'en charge. Reponds brievement.";

/** Chemin horodate `docs/design/<date>-<HHmmss>.html` (UTC): un fichier par run, jamais ecrase. */
export function designPath(d: Date = new Date()): string {
  const iso = d.toISOString();
  return `docs/design/${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, "")}.html`;
}
/** Recap associe a un design : `recap-` + meme horodatage. */
export function recapPath(design: string): string {
  return design.replace(/([^/]+)$/, "recap-$1");
}
const DESIGN = designPath(); // valeur par defaut dans les prompts; remplacee par celle du run (promptFor)
let current = DESIGN;
/** Fige le fichier de design du run qui commence (appele au debut du secteur design). */
export function beginDesignRun(d: Date = new Date()): string { return (current = designPath(d)); }
/** Fichier de design du run en cours (lu par l'implementation et le recap). */
export function currentDesignPath(): string { return current; }
/** Prompt du secteur avec le fichier de design du run courant. */
export function promptFor(s: SectorDef): string { return s.prompt.split(DESIGN).join(current); }

/** Definitions des trois secteurs, dans l'ordre d'execution (design d'abord). */
export const SECTOR_DEFS: SectorDef[] = [
  {
    id: "design", kind: "think", maxTurns: 40, share: 0.15,
    prompt:
      "Secteur design/UX, AVANT tout code. Lis CLAUDE.md (section Design, regles), src/styles/, " +
      "docs/recherche/fonctionnalites.md et TODO.md. Choisis les 1 a 3 meilleures idees non realisees et " +
      `produis UN fichier ${DESIGN} (nom exact, jamais ecrase: un design existant reste intact) : toile libre, page HTML autonome ` +
      "(CSS et JS en ligne; scripts, animations, canvas/SVG et interactions permis; aucune requete ni ressource externe: la CSP les bloque). " +
      "La page parente peut poser `data-theme=\"dark\"` ou `\"light\"` sur <html>: prevois les themes clair ET sombre (data-theme ET prefers-color-scheme). " +
      "Conventions et gabarit: skill `design-canvas` (.claude/skills/design-canvas). " +
      "Pour chaque idee: une maquette visuelle (ecrans et etats, tokens de " +
      "src/styles/, outil professionnel sans texte decoratif), animee quand le mouvement explique le comportement, puis une section interfaces/contrats " +
      "(fonctions, types, evenements, fichiers touches). Ne modifie aucun autre fichier. " +
      "Ne touche pas a git (la boucle s'en charge). Reponds brievement.",
  },
  {
    id: "implementation", kind: "think", maxTurns: 60, share: 0.4,
    prompt:
      `Secteur implementation. Lis d'abord le design ${DESIGN} et construis dessus. S'il est absent, dis-le ` +
      "et replie-toi sur docs/recherche/fonctionnalites.md et TODO.md : choisis 1 a 3 " +
      "fonctionnalites non cochees, prioritaires et petites, et implemente-les. " + RULES,
  },
  {
    id: "correction", kind: "think", maxTurns: 40, share: 0.2,
    prompt:
      "Secteur correction. Lance `npm test` puis `npx tsc --noEmit`. Pour chaque echec ou erreur de " +
      "type, ecris un test qui reproduit le bug, puis corrige le code (jamais en affaiblissant un " +
      "test existant). Repete jusqu'a ce que tout soit vert. " + RULES,
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
    options: agentOptions("edit", {
      model: MODEL_BY_KIND[s.kind], maxTurns: s.maxTurns, maxBudgetUsd: o.maxBudgetUsd, env: o.env, abort: o.abort, cwd: o.cwd,
    }),
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
  /** Consigne ajoutee au prompt de cette execution (ex. cartes de la tournee). */
  task?: string;
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
      const cap = ctx.budget.cap();
      let cost = 0;
      if (d.id === "design") beginDesignRun();
      ctx.emit({ type: "start", sector: d.id });
      const abort = toController(ctx.signal);
      for (let i = 0; i < MAX_PASSES && !ctx.signal.aborted && !ctx.budget.exhausted(); i++) {
        const granted = ctx.budget.reserve(cap * d.share);
        if (granted <= 0) break;
        const r = await runSector({ ...d, prompt: promptFor(d) + (ctx.task ? `\n\n${ctx.task}` : "") }, { query: ctx.query, maxBudgetUsd: granted, env: ctx.env, abort, cwd: ctx.dir });
        ctx.budget.settle(granted, r.costUsd);
        cost += r.costUsd;
        if (r.ok) break;
      }
      ctx.emit({
        type: "end", sector: d.id, costUsd: cost, elapsedS: Math.round((Date.now() - t0) / 1000),
        totalUsd: ctx.budget.spent(), remainingUsd: ctx.budget.left(),
      });
    },
  };
}

/** Les trois secteurs, dans l'ordre d'execution. */
export const SECTORS: Sector[] = SECTOR_DEFS.map(makeSector);
