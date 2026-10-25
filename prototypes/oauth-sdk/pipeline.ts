/**
 * Chaine de la boucle : research -> design -> implementation -> correction.
 *
 * Quoi : pour chaque secteur, worktree + branche `wt/<secteur>-<ts>` (git.ts), execution dans
 *        ce dossier, commit, fusion dans `developpement` seulement si tests + tsc sont verts.
 * Pourquoi : un seul budget partage (budget.ts) pour tous les secteurs; arret des que le budget
 *        est epuise (90 %) ou que l'abandon est demande. Jamais de push, jamais master.
 * Usage : `createPipeline({ query, run, cwd })` -> `(opts: RunOpts) => Promise<void>` (voir boucle.ts).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createBudget, type Budget } from "./budget";
import { listDesigns, readDesign, watchDesigns } from "./designs";
import { createGitFlow, type Run } from "./git";
import { allDone, type BoardCard } from "./cards";
import type { QueryFn } from "./research";
import { researchSector } from "./researchSector";
import { pickBatch, reportRules } from "./reportRules";
import { watchReports as defaultWatchReports } from "./reportWatch";
import { SECTORS, currentDesignPath, recapPath, type Sector } from "./sectors";
import type { BoucleEvent, RunOpts } from "./server";
import { summarizePhase, type Status } from "./summary";

/** Libelle francais d'une phase (resume et panneau). */
const LABEL: Record<string, string> = { research: "recherche", implementation: "implémentation", correction: "correction", design: "design" };

/** Dependances injectees (vraies dans boucle.ts, factices dans les tests). */
export interface PipelineDeps {
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
  /** Etat des cartes une fois fusionne (absent: un seul passage implementation + correction, sans boucle). */
  board?: () => Promise<BoardCard[]>;
  /** Surveillance des rapports d'un worktree (defaut: reportWatch.ts; injectable pour les tests). */
  watchReports?: typeof defaultWatchReports;
  /** Suivi des designs (defauts: designs.ts; injectables pour les tests). */
  watchDesigns?: typeof watchDesigns;
  listDesigns?: typeof listDesigns;
  readDesign?: typeof readDesign;
}

/** Tournees max (garde-fou en plus du budget et de la detection d'absence de progres). */
const MAX_ROUNDS = 12;
const DESIGN_DIR = join("docs", "design");

/** Ecriture disque par defaut. */
function diskWrite(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** Construit `runPipeline` lie a ses dependances. */
export function createPipeline(deps: PipelineDeps): (o: RunOpts) => Promise<{ complete: boolean } | undefined> {
  const write = deps.writeFile ?? diskWrite;
  const inner = async ({ budgetEur, onEvent, signal }: RunOpts): Promise<{ complete: boolean } | undefined> => {
    const budget = createBudget(budgetEur, deps.eurUsd);
    deps.onBudget?.(budget);
    const flow = createGitFlow(deps.run, deps.cwd);
    await flow.ensureDev();

    const research = researchSector(write);
    const all = [research, ...SECTORS];
    const status: Record<string, Status> = Object.fromEntries(all.map((x) => [x.name, "pending"]));
    /** Resume de la phase (Haiku ou repli): emis au panneau et journalise. */
    const summarize = async (name: string) => {
      const message = await summarizePhase({
        phase: LABEL[name] ?? name,
        phases: all.map((x) => ({ name: LABEL[x.name] ?? x.name, status: status[x.name] })),
        agents: [], spentUsd: budget.spent(), remainingUsd: budget.remaining(),
      }, { query: deps.query, budget, env: deps.env });
      onEvent({ type: "summary", phase: name, message });
      onEvent({ type: "info", sector: name, message: `resume: ${message}` });
    };

    /** Un secteur: worktree, execution (consigne `task` en plus), commit, fusion si vert. */
    const runOne = async (sector: Sector, task?: string): Promise<boolean> => {
      const { branch, dir } = await flow.startSector(sector.name);
      deps.onDir?.(dir);
      status[sector.name] = "running";
      // l'evenement `end` du secteur est retenu pour porter `ok` (resultat de la fusion)
      let held: BoucleEvent | undefined;
      const isDesign = sector.name === "design";
      const ddir = join(dir, DESIGN_DIR);
      const steps: BoucleEvent[] = [];
      const emit = (e: BoucleEvent) => {
        if (isDesign) steps.push(e);
        if (e.type === "end" && e.sector === sector.name && !e.axis) held = e; else onEvent(e);
      };
      let stopWatch: (() => void) | undefined;
      if (isDesign) {
        deps.onSectorDir?.(ddir);
        stopWatch = (deps.watchDesigns ?? watchDesigns)(ddir, (f) => emit({ type: "file", sector: "design", message: f.name, state: f.state, ts: f.mtimeMs }));
      }
      let ok = false;
      const stopReports = sector.name === "implementation"
        ? (deps.watchReports ?? defaultWatchReports)(join(dir, "docs", "rapports"), (id) => onEvent({ type: "card", sector: "implementation", cardId: id }))
        : undefined;
      try {
        await sector.run({ query: deps.query, budget, emit, dir, signal, env: deps.env, task });
        if (isDesign && deps.buildRecap) {
          stopWatch?.();
          // recap du design de CE run (les precedents restent dans leurs propres fichiers); repli: tous les designs
          const all = (await (deps.listDesigns ?? listDesigns)(ddir)).filter((f) => f.kind === "design");
          const mine = all.filter((f) => f.name === basename(currentDesignPath()));
          const files = mine.length ? mine : all;
          const read = deps.readDesign ?? readDesign;
          const designs = [];
          for (const f of files) designs.push({ name: f.name, html: (await read(ddir, f.name)) ?? "", mtimeMs: f.mtimeMs });
          write(join(ddir, basename(recapPath(currentDesignPath()))), deps.buildRecap(designs, steps));
        }
        await flow.commit(dir, `Boucle: ${sector.name}`);
        const m = await flow.mergeIfGreen(branch, dir);
        ok = m.merged;
        onEvent({
          type: "info", sector: sector.name,
          message: m.merged ? `${branch} fusionne dans developpement` : `non fusionne (${m.reason ?? "?"})`,
        });
      } finally {
        stopReports?.();
        deps.onDir?.(null);
        if (isDesign) { stopWatch?.(); deps.onSectorDir?.(null); }
        status[sector.name] = ok ? "ok" : "failed";
        if (held) onEvent({ ...(held as BoucleEvent), ok });
        await summarize(sector.name);
      }
      return ok;
    };

    /** Vrai (avec message) si la boucle doit s'arreter: abandon ou budget epuise. */
    const stopped = (): boolean => {
      if (!signal.aborted && !budget.exhausted()) return false;
      onEvent({ type: "info", message: signal.aborted ? "arrete" : "budget epuise (90 %)" });
      return true;
    };

    // recherche puis design, une fois
    const [implementation, correction] = SECTORS.filter((x) => x.name !== "design");
    for (const sector of [research, ...SECTORS.filter((x) => x.name === "design")]) {
      if (stopped()) return deps.board ? { complete: false } : undefined;
      await runOne(sector);
    }
    if (!deps.board) {
      for (const sector of [implementation, correction]) { if (stopped()) break; await runOne(sector); }
      return undefined;
    }

    // tournees jusqu'a ce que toutes les cartes soient terminees (preuves validees et fusionnees)
    let cards = await deps.board();
    let round = 0, stagnant = 0;
    while (!allDone(cards) && !stopped() && round < MAX_ROUNDS && stagnant < 2) {
      round++;
      const before = cards.filter((c) => c.state === "termine").length;
      const batch = pickBatch(cards);
      onEvent({ type: "info", round, message: `tournee ${round} : ${cards.length - before} carte(s) restante(s), lot ${batch.map((c) => c.id).join(", ")}` });
      await runOne(implementation, reportRules(batch));
      if (!stopped()) await runOne(correction, "Verifie aussi que chaque rapport de docs/rapports/ dit vrai : tests verts, captures presentes.");
      cards = await deps.board();
      stagnant = cards.filter((c) => c.state === "termine").length > before ? 0 : stagnant + 1;
    }
    const complete = allDone(cards);
    const left = cards.filter((c) => c.state !== "termine").map((c) => `${c.id} (${c.state})`).join(", ");
    onEvent({
      type: "info", complete,
      message: complete ? "boucle terminee : toutes les cartes sont terminees" : `non termine, sans progres ou budget : ${left}`,
    });
    return { complete };
  };
  return async (o) => {
    try { return await inner(o); } finally { deps.onBudget?.(null); }
  };
}
