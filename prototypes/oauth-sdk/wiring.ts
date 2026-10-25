/**
 * Cablage du serveur de la boucle (separe de boucle.ts pour etre testable sans jeton ni port fixe).
 *
 * Quoi : assemble pipeline, moodboard, designs et pages (panneau, moodboard.html, design.html,
 *        assets panel.css/panel.js) dans `createServer`. Les pages sont lues depuis le dossier de
 *        ce code (pas du cwd) et relues a chaque requete, donc sans redemarrage apres modification.
 * Usage : `buildBoucleServer({ query, run, env, cwd })` -> Server (a passer a `listen`).
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBudgetEur, type Budget } from "./budget";
import { withStates } from "./designs";
import { createDesignStore } from "./designStore";
import type { Run } from "./git";
import { buildMoodboard, pickBudget } from "./moodboard";
import { createPipeline } from "./pipeline";
import { buildRecap } from "./recap";
import type { QueryFn } from "./research";
import { createServer, type BoucleEvent } from "./server";

/** Dependances reelles (ou factices en test). */
export interface WiringOpts { query: QueryFn; run: Run; env: Record<string, string>; cwd: string }

/** Lit un fichier du dossier du code; `undefined` s'il est absent (=> 404). */
const here = dirname(fileURLToPath(import.meta.url));
const page = (name: string): string | undefined => {
  try { return readFileSync(join(here, name), "utf-8"); } catch { return undefined; }
};

/** Construit le serveur complet de la boucle (non demarre). */
export function buildBoucleServer(o: WiringOpts): Server {
  // Moodboard : budget du run en cours (partage, jamais au-dela du plafond utilisateur), sinon <= 0,05 EUR par rafraichissement.
  let activeBudget: Budget | null = null;
  const moodCache = new Map<string, string>();
  // Designs : tous les designs stockes (secteur actif + arbre principal + ref developpement) et etapes du secteur.
  let activeDesignDir: string | null = null;
  const store = createDesignStore({ cwd: o.cwd, run: o.run, activeDir: () => activeDesignDir });
  const designSteps: BoucleEvent[] = [];
  const pipeline = createPipeline({
    query: o.query, run: o.run, cwd: o.cwd, env: o.env, buildRecap,
    onBudget: (b) => { activeBudget = b; }, onSectorDir: (d) => { activeDesignDir = d; },
  });
  return createServer({
    runPipeline: (r) => {
      designSteps.length = 0;
      return pipeline({ ...r, onEvent: (e) => { if (e.sector === "design") designSteps.push(e); r.onEvent(e); } });
    },
    designs: { list: async () => withStates(await store.list(), designSteps), read: (n) => store.read(n), steps: () => designSteps },
    designHtml: () => page("design.html"),
    parseBudgetEur,
    panelHtml: () => page("panel.html") ?? "<p>panel.html introuvable</p>",
    assetsDir: here,
    moodboard: () => buildMoodboard({
      readFile: (p) => readFile(join(o.cwd, p), "utf-8"),
      query: o.query, budget: pickBudget(() => activeBudget), cache: moodCache, env: o.env,
    }),
    moodboardHtml: () => page("moodboard.html"),
  });
}
