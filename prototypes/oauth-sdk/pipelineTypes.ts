/**
 * Dependances injectees du pipeline (extraites de pipeline.ts pour tenir sous 200 lignes).
 * Usage : `import type { PipelineDeps } from "./pipelineTypes"` (re-exporte par pipeline.ts).
 */
import type { LockStat } from "./concurrency";
import type { Budget } from "./budget";
import type { BoardCard } from "./cards";
import type { listDesigns, readDesign, watchDesigns } from "./designs";
import type { Run } from "./git";
import type { QueryFn } from "./research";
import type { watchReports as defaultWatchReports } from "./reportWatch";
import type { QualifCache } from "./qualify";
import type { StateStore } from "./runState";
import type { BoucleEvent } from "./server";

/** Dependances injectees (vraies dans boucle.ts, factices dans les tests). */
export interface PipelineDeps {
  /** Etat persistant du run (.boucle/state.json): reprise apres crash (absent: aucune persistance). */
  state?: StateStore;
  /** Mesure des verrous (attente, duree) pour le journal. */
  onLock?: (s: LockStat) => void;
  /** Journal des problemes d'etat et des reprises (absent: silencieux). */
  warn?: (msg: string) => void;
  query: QueryFn;
  run: Run;
  /** Racine du depot. */
  cwd: string;
  env?: Record<string, string>;
  /** Taux EUR -> USD (defaut: env EUR_USD ou 1.08). */
  eurUsd?: number;
  /** Ecriture de fichier (defaut: fs, dossiers crees). */
  writeFile?: (path: string, text: string) => void;
  /** Budget du run en cours (null une fois fini): partage avec le moodboard. */
  onBudget?: (b: Budget | null) => void;
  /** Worktree du secteur en cours (null une fois fini): pour lire les rapports en direct. */
  onDir?: (dir: string | null) => void;
  /** Dossier docs/design du secteur design en cours (null une fois fini): pour servir les designs en direct. */
  onSectorDir?: (designDir: string | null) => void;
  /** Recap HTML des designs (recap.ts `buildRecap`); absent: pas de recap.html. */
  buildRecap?: (designs: { name: string; html: string; mtimeMs: number }[], steps: BoucleEvent[]) => string;
  /** Opt-in: resumes de fin de phase rediges par Haiku (defaut: texte deterministe, aucun processus Claude). */
  llmSummaries?: boolean;
  /** Agents d'implementation en parallele (defaut 1 = un seul agent pour tout le lot; boucle.ts: `BOUCLE_PARALLEL`, defaut 3). */
  parallel?: number;
  /** Worktrees des agents en cours (liste vide une fois finis): pour lire leurs rapports en direct. */
  onDirs?: (dirs: string[]) => void;
  /** Pousser `developpement` apres chaque fusion validee (defaut: non; boucle.ts l'active, `BOUCLE_PUSH=0` le coupe). */
  push?: boolean;
  /** Cartes non terminees avant la recherche (absent: la recherche tourne toujours). */
  unfinished?: () => Promise<number>;
  /** Etat des cartes une fois fusionne (absent: un seul passage implementation + correction, sans boucle). */
  board?: (active?: string[]) => Promise<BoardCard[]>;
  /** Qualification des cartes de chaque lot (qualify.ts): lecture de fichiers du depot, titres des cartes terminees, cache. Absent: aucune qualification. */
  qualif?: { read: (path: string) => Promise<string | null>; doneTitles: () => Promise<string[]>; cache?: QualifCache };
  /** Surveillance des rapports d'un worktree (defaut: reportWatch.ts; injectable pour les tests). */
  watchReports?: typeof defaultWatchReports;
  /** Suivi des designs (defauts: designs.ts; injectables pour les tests). */
  watchDesigns?: typeof watchDesigns;
  listDesigns?: typeof listDesigns;
  readDesign?: typeof readDesign;
}
