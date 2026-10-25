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
import { reportRules } from "./reportRules";
import { createPlanner, stopMessage, type StopReason } from "./rounds";
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
  /** Opt-in: resumes de fin de phase rediges par Haiku (defaut: texte deterministe, aucun processus Claude). */
  llmSummaries?: boolean;
  /** Etat des cartes une fois fusionne (absent: un seul passage implementation + correction, sans boucle). */
  board?: () => Promise<BoardCard[]>;
  /** Surveillance des rapports d'un worktree (defaut: reportWatch.ts; injectable pour les tests). */
  watchReports?: typeof defaultWatchReports;
  /** Suivi des designs (defauts: designs.ts; injectables pour les tests). */
  watchDesigns?: typeof watchDesigns;
  listDesigns?: typeof listDesigns;
  readDesign?: typeof readDesign;
}

const DESIGN_DIR = join("docs", "design");

/** Ecriture disque par defaut. */
function diskWrite(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** Construit `runPipeline` lie a ses dependances. */
export function createPipeline(deps: PipelineDeps): (o: RunOpts) => Promise<{ complete: boolean; reason?: StopReason } | undefined> {
  const write = deps.writeFile ?? diskWrite;
  const inner = async ({ budgetEur, onEvent, signal }: RunOpts): Promise<{ complete: boolean; reason?: StopReason } | undefined> => {
    const budget = createBudget(budgetEur, deps.eurUsd);
    deps.onBudget?.(budget);
    const flow = createGitFlow(deps.run, deps.cwd);
    await flow.ensureDev();

    const research = researchSector(write);
    const all = [research, ...SECTORS];
    const status: Record<string, Status> = Object.fromEntries(all.map((x) => [x.name, "pending"]));
    /** Cartes restantes apres la derniere lecture du tableau (indefini avant: pas de boucle de cartes). */
    let remaining: number | undefined;
    let halt: StopReason | "" = "";
    /** Resume de la phase (Haiku ou repli): emis au panneau et journalise. */
    const summarize = async (name: string) => {
      const message = await summarizePhase({
        phase: LABEL[name] ?? name,
        phases: all.map((x) => ({ name: LABEL[x.name] ?? x.name, status: status[x.name] })),
        agents: [], remaining, halt: halt && halt !== "complete" ? halt : undefined, spentUsd: budget.spent(), remainingUsd: budget.left(), eurUsd: budget.eurUsd,
      }, { query: deps.query, budget, env: deps.env, llm: deps.llmSummaries });
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
        if (isDesign) { stopWatch?.(); if (ok) deps.onSectorDir?.(null); } // non fusionne: le worktree reste, la page Design l'affiche encore
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
      if (stopped()) {
        const early: StopReason = signal.aborted ? "abort" : "budget";
        onEvent({ type: "info", complete: false, reason: early, message: `${early === "abort" ? "arrete" : "budget epuise"} avant la fin des cartes` });
        return deps.board ? { complete: false, reason: early } : undefined;
      }
      await runOne(sector);
    }
    if (!deps.board) {
      for (const sector of [implementation, correction]) { if (stopped()) break; await runOne(sector); }
      return undefined;
    }

    // tournees jusqu'a ce que toutes les cartes soient terminees; arret seulement: budget epuise,
    // abandon, aucune avancee pendant `patience` tournees, ou garde-fou de tournees
    const planner = createPlanner();
    let cards = await deps.board();
    remaining = cards.filter((c) => c.state !== "termine").length;
    planner.observe(cards);
    let round = 0;
    let reason: StopReason = "complete";
    while (!allDone(cards)) {
      if (signal.aborted) { reason = "abort"; break; }
      if (budget.exhausted()) { reason = "budget"; break; }
      if (planner.stuck()) { reason = "stuck"; break; }
      if (round >= planner.maxRounds) { reason = "max-rounds"; break; }
      round++;
      const batch = planner.nextBatch(cards);
      onEvent({ type: "info", round, message: `tournee ${round} : ${remaining} carte(s) restante(s), lot ${batch.map((c) => c.id).join(", ")}` });
      await runOne(implementation, reportRules(batch));
      if (!stopped()) await runOne(correction, "Verifie aussi que chaque rapport de docs/rapports/ dit vrai : tests verts, captures presentes.");
      cards = await deps.board();
      remaining = cards.filter((c) => c.state !== "termine").length;
      planner.observe(cards);
    }
    const complete = allDone(cards);
    remaining = cards.filter((c) => c.state !== "termine").length; halt = reason;
    await summarize("correction"); // dernier resume: « terminee » seulement si plus aucune carte
    onEvent({ type: "info", complete, reason, message: stopMessage(reason, cards.filter((c) => c.state !== "termine")) });
    return { complete, reason };
  };
  return async (o) => {
    try { return await inner(o); } finally { deps.onBudget?.(null); }
  };
}
