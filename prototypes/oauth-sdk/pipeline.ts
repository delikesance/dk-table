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
import { dirname, join } from "node:path";
import { createBudget, type Budget } from "./budget";
import { createGitFlow, type Run } from "./git";
import { runResearch, type QueryFn } from "./research";
import { SECTORS, toController, type Sector } from "./sectors";
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
}

const DOC = join("docs", "recherche", "fonctionnalites.md");

/** Ecriture disque par defaut. */
function diskWrite(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** Construit `runPipeline` lie a ses dependances. */
export function createPipeline(deps: PipelineDeps): (o: RunOpts) => Promise<void> {
  const write = deps.writeFile ?? diskWrite;
  const inner = async ({ budgetEur, onEvent, signal }: RunOpts): Promise<void> => {
    const budget = createBudget(budgetEur, deps.eurUsd);
    deps.onBudget?.(budget);
    const flow = createGitFlow(deps.run, deps.cwd);
    await flow.ensureDev();

    /** Secteur recherche: 4 axes en parallele, synthese ecrite dans le worktree. */
    const research: Sector = {
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

    for (const sector of all) {
      if (signal.aborted || budget.exhausted()) {
        onEvent({ type: "info", message: signal.aborted ? "arrete" : "budget epuise (90 %)" });
        break;
      }
      const { branch, dir } = await flow.startSector(sector.name);
      status[sector.name] = "running";
      // l'evenement `end` du secteur est retenu pour porter `ok` (resultat de la fusion)
      let held: BoucleEvent | undefined;
      const emit = (e: BoucleEvent) => { if (e.type === "end" && e.sector === sector.name && !e.axis) held = e; else onEvent(e); };
      let ok = false;
      try {
        await sector.run({ query: deps.query, budget, emit, dir, signal, env: deps.env });
        await flow.commit(dir, `Boucle: ${sector.name}`);
        const m = await flow.mergeIfGreen(branch, dir);
        ok = m.merged;
        onEvent({
          type: "info", sector: sector.name,
          message: m.merged ? `${branch} fusionne dans developpement` : `non fusionne (${m.reason ?? "?"})`,
        });
      } finally {
        status[sector.name] = ok ? "ok" : "failed";
        if (held) onEvent({ ...(held as BoucleEvent), ok });
        await summarize(sector.name);
      }
    }
  };
  return async (o) => {
    try { await inner(o); } finally { deps.onBudget?.(null); }
  };
}
