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
import { listDesigns, readDesign, watchDesigns } from "./designs";
import { writeDesignRecap } from "./designRecap";
import { createGitFlow, type Run } from "./git";
import type { BoardCard } from "./cards";
import type { QueryFn } from "./research";
import { researchGate } from "./researchGate";
import { researchSector } from "./researchSector";
import { parseOverride } from "./routing";
import type { AgentResult } from "./parallel";
import { runRounds, stopMessage, type StopReason } from "./rounds";
import { watchReports as defaultWatchReports } from "./reportWatch";
import { SECTORS, type Sector } from "./sectors";
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
  const flow = createGitFlow(deps.run, deps.cwd, { push: deps.push });
  const inner = async ({ budgetEur, onEvent, signal }: RunOpts): Promise<{ complete: boolean; reason?: StopReason } | undefined> => {
    const budget = createBudget(budgetEur, deps.eurUsd);
    deps.onBudget?.(budget);
    const models = parseOverride(deps.env?.BOUCLE_MODELS);
    const parallel = Math.max(1, Math.floor(deps.parallel ?? 1));
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
    const live = new Set<string>(), inflight: Record<string, number> = {};
    const setDir = (dir: string, on: boolean) => { if (on) live.add(dir); else live.delete(dir); deps.onDir?.(on ? dir : [...live].at(-1) ?? null); deps.onDirs?.([...live]); };
    const runOne = async (sector: Sector, task?: string, attempt = 0, cards: { id: string }[] = []): Promise<AgentResult> => {
      const agent = cards.map((c) => c.id).join(", ") || undefined;
      const { branch, dir } = await flow.startSector(sector.name, cards.map((c) => c.id).join("-"));
      setDir(dir, true); inflight[sector.name] = (inflight[sector.name] ?? 0) + 1;
      status[sector.name] = "running";
      // l'evenement `end` du secteur est retenu pour porter `ok` (resultat de la fusion)
      let held: BoucleEvent | undefined;
      const isDesign = sector.name === "design";
      const ddir = join(dir, DESIGN_DIR);
      const steps: BoucleEvent[] = [];
      const send = (e: BoucleEvent) => onEvent(agent ? { ...e, agent } : e); // chaque evenement d'un agent porte sa carte
      const emit = (e: BoucleEvent) => {
        if (isDesign) steps.push(e);
        if (e.type === "end" && e.sector === sector.name && !e.axis) held = e; else send(e);
      };
      let stopWatch: (() => void) | undefined;
      if (isDesign) {
        deps.onSectorDir?.(ddir);
        stopWatch = (deps.watchDesigns ?? watchDesigns)(ddir, (f) => emit({ type: "file", sector: "design", message: f.name, state: f.state, ts: f.mtimeMs }));
      }
      let ok = false, conflict = false;
      const stopReports = sector.name === "implementation"
        ? (deps.watchReports ?? defaultWatchReports)(join(dir, "docs", "rapports"), (id) => send({ type: "card", sector: "implementation", cardId: id }))
        : undefined;
      try {
        await sector.run({ query: deps.query, budget, emit, dir, signal, env: deps.env, task, attempt, models, slots: sector.name === "implementation" ? parallel : 1 });
        if (isDesign && deps.buildRecap) {
          stopWatch?.();
          await writeDesignRecap({ ddir, steps, build: deps.buildRecap, write, list: deps.listDesigns ?? listDesigns, read: deps.readDesign ?? readDesign });
        }
        await flow.commit(dir, `Boucle: ${sector.name}`);
        const m = await flow.mergeIfGreen(branch, dir);
        ok = m.merged; conflict = !!m.conflict; if (!ok && !isDesign) await flow.release(branch, dir); // le design non fusionne reste affiche par la toile
        send({
          type: "info", sector: sector.name,
          message: m.merged ? `${branch} fusionne dans developpement` : `non fusionne (${m.reason ?? "?"})`,
        });
        if (m.preexisting?.length) send({ type: "info", sector: sector.name, message: `anomalie : test(s) deja rouge(s) sur developpement, sans rapport avec la carte : ${m.preexisting.join("; ")}` });
        if (m.merged && m.push) send({ type: "info", sector: sector.name, message: m.push.pushed ? "developpement pousse sur origin" : `push non effectue : ${m.push.reason}` });
      } finally {
        stopReports?.();
        setDir(dir, false); inflight[sector.name]--;
        if (isDesign) { stopWatch?.(); if (ok) deps.onSectorDir?.(null); } // non fusionne: le worktree reste, la page Design l'affiche encore
        status[sector.name] = ok ? "ok" : "failed";
        if (held) send({ ...(held as BoucleEvent), ok });
        if (!inflight[sector.name]) await summarize(sector.name); // un seul resume quand le dernier agent du secteur a fini
      }
      return { merged: ok, conflict };
    };

    /** Vrai (avec message) si la boucle doit s'arreter: abandon ou budget epuise. */
    const stopped = (): boolean => {
      if (!signal.aborted && !budget.exhausted()) return false;
      onEvent({ type: "info", message: signal.aborted ? "arrete" : "budget epuise (90 %)" });
      return true;
    };

    // recherche (sautee s'il y a deja assez de cartes a traiter) puis design, une fois
    const [implementation, correction] = SECTORS.filter((x) => x.name !== "design");
    const enough = await researchGate({ unfinished: deps.unfinished, env: deps.env, emit: onEvent, budget }); if (enough) status.research = "ok";
    for (const sector of [...(enough ? [] : [research]), ...SECTORS.filter((x) => x.name === "design")]) {
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

    // tournees (voir rounds.ts) puis dernier resume: « terminee » seulement si plus aucune carte
    const res = await runRounds({
      board: (active) => deps.board!(active),
      impl: (task, attempt, cards) => runOne(implementation, task, attempt, cards), parallel,
      corr: async (task, attempt) => (await runOne(correction, task, attempt)).merged,
      emit: onEvent, progress: (n) => { remaining = n; },
      halt: () => (signal.aborted ? "abort" : budget.exhausted() ? "budget" : null),
    });
    const { complete, reason, cards } = res;
    if (status.correction === "pending") status.correction = "ok"; // ecartee par la validation de code, pas manquante
    remaining = cards.filter((c) => c.state !== "termine").length; halt = reason;
    await summarize("correction");
    onEvent({ type: "info", complete, reason, message: stopMessage(reason, cards.filter((c) => c.state !== "termine")) });
    return { complete, reason };
  };
  return async (o) => {
    try { return await inner(o); } finally { deps.onBudget?.(null); await flow.dispose().catch(() => {}); }
  };
}
