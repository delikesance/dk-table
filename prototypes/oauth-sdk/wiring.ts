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
import { buildBoard, cardDetail, type BoardCard } from "./cards";
import { createFileLedger } from "./doneLedger";
import { createFileStale, repairOrphans } from "./stale";
import { createFiles, type Order } from "./files";
import { pickBudget } from "./moodboard";
import { memo, memoBy } from "./memo";
import { createPipeline } from "./pipeline";
import { buildRecap } from "./recap";
import type { QueryFn } from "./research";
import { createServer, type BoucleEvent } from "./server";
import { logEvent, trackBoard, wrapQuery, wrapRun } from "./instrument";
import { createRunLogs } from "./wiringLogs";
import { createFileStateStore } from "./runState";

/** Dependances reelles (ou factices en test). */
export interface WiringOpts { query: QueryFn; run: Run; env: Record<string, string>; cwd: string; /** Pousser developpement apres chaque fusion (defaut: sauf BOUCLE_PUSH=0). */ push?: boolean }

/** Agents en parallele: `BOUCLE_PARALLEL` (entier >= 1), defaut 3; 1 = un seul agent pour tout le lot. */
export const parallelOf = (v?: string): number => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 1 ? Math.min(n, 8) : 3; };

/** Lit un fichier du dossier du code; `undefined` s'il est absent (=> 404). */
const here = dirname(fileURLToPath(import.meta.url));
const page = (name: string): string | undefined => {
  try { return readFileSync(join(here, name), "utf-8"); } catch { return undefined; }
};

/** Construit le serveur complet de la boucle (non demarre). */
export function buildBoucleServer(raw: WiringOpts): Server {
  // Journal technique: toutes les commandes et appels modele passent par les enveloppes (run courant, sinon « hors run »).
  const rl = createRunLogs({ cwd: raw.cwd, env: raw.env });
  const o: WiringOpts = { ...raw, run: wrapRun(raw.run, rl.cur), query: wrapQuery(raw.query, rl.cur) };
  const seen = new Map<string, string>(); // etat precedent des cartes (transitions journalisees)
  // Moodboard : budget du run en cours (partage, jamais au-dela du plafond utilisateur), sinon <= 0,05 EUR par rafraichissement.
  let activeBudget: Budget | null = null;
  const moodCache = new Map<string, string>();
  // Designs : tous les designs stockes (secteur actif + arbre principal + ref developpement) et etapes du secteur.
  let activeDesignDir: string | null = null;
  const store = createDesignStore({ cwd: o.cwd, run: o.run, activeDir: () => activeDesignDir });
  const designSteps: BoucleEvent[] = [];
  const listMemo = memo(() => store.list(), 2000);
  // Fichiers en couches: worktree actif (rapports en direct), arbre principal, ref developpement.
  let activeDir: string | null = null, activeDirs: string[] = [];
  const files = createFiles({ cwd: o.cwd, run: o.run, activeDir: () => activeDir, activeDirs: () => activeDirs });
  // Etat persistant du run (reprise apres crash); un fichier corrompu est journalise et ignore.
  const state = createFileStateStore(join(o.cwd, ".boucle", "state.json"), { onWarn: (m) => rl.cur().warn("etat", m) });
  // Cartes terminees: registre durable (jamais purge), hors depot (.boucle/ ignore par git).
  const ledger = createFileLedger(join(o.cwd, ".boucle", "termines.jsonl"));
  // Rapports « en cours » d'un run interrompu: archives au demarrage, ignores ensuite (hors depot).
  const stale = createFileStale(join(o.cwd, ".boucle", "perimes.jsonl"), join(o.cwd, ".boucle", "archives"));
  // Cartes du lot en cours de traitement (evenement de tournee): seules celles-ci peuvent etre « en cours ».
  let activeIds: ReadonlySet<string> = new Set();
  let events = 0; // compteur d'evenements: tout evenement invalide le cache du moodboard (temps reel)
  const boardOf = (order: Order, active: ReadonlySet<string> = activeIds) => buildBoard({
    ledger, active, stale,
    deferred: () => new Map(Object.entries(state.load().cards).filter(([, c]) => c.deferred).map(([id, c]) => [id, c.deferred!])),
    readFile: async (p) => (await files.read(p, order)) ?? Promise.reject(new Error("absent")),
    exists: (p) => files.exists(p, order),
    query: o.query, budget: pickBudget(() => activeBudget), cache: moodCache, env: o.env,
  });
  const tracked = (b: Promise<BoardCard[]>) => b.then((cs) => { trackBoard(rl.cur(), seen, cs); return cs; });
  const pipeline = createPipeline({
    state, onLock: (s) => rl.cur()[s.waitMs >= 1000 ? "info" : "debug"]("verrou", s.name, { lock: s.name, waitMs: s.waitMs, holdMs: s.holdMs }),
    query: o.query, run: o.run, cwd: o.cwd, env: o.env, buildRecap, push: o.push ?? o.env.BOUCLE_PUSH !== "0",
    unfinished: async () => (await boardOf("merged", new Set())).filter((c) => c.state !== "termine").length,
    board: (a) => { activeIds = new Set(a ?? []); return tracked(boardOf("merged", activeIds)); },
    onBudget: (b) => { activeBudget = b; }, onSectorDir: (d) => { activeDesignDir = d; }, onDir: (d) => { activeDir = d; }, onDirs: (d) => { activeDirs = d; }, parallel: parallelOf(o.env.BOUCLE_PARALLEL),
  });
  return createServer({
    runPipeline: (r) => {
      designSteps.length = 0; seen.clear();
      const log = rl.startRun();
      log.info("run", "debut", { budgetEur: r.budgetEur, parallel: parallelOf(o.env.BOUCLE_PARALLEL), push: o.push ?? o.env.BOUCLE_PUSH !== "0", niveau: o.env.BOUCLE_LOG ?? "info" });
      const repair = boardOf("merged", new Set()).then((b) => repairOrphans(b, async (p) => (await files.read(p, "merged")) ?? "", stale)).catch(() => []);
      const onEvent = (e: BoucleEvent) => {
        if (e.sector === "design") designSteps.push(e);
        if (e.round && e.cards) { activeIds = new Set(e.cards); log.info("tournee", `tournee ${e.round}`, { cards: e.cards }); }
        logEvent(log, e); r.onEvent(e);
      };
      return repair.then((fixed) => { if (fixed.length) onEvent({ type: "info", message: `${fixed.length} rapport(s) perime(s) archive(s), cartes remises en idee : ${fixed.join(", ")}` }); })
        .then(() => pipeline({ ...r, onEvent }))
        .catch((err) => { log.error("run", "run en erreur", { err }); throw err; })
        .finally(async () => {
          activeIds = new Set(); log.info("run", "fin");
          const text = await rl.endRun();
          const n = (/Anomalies \((\d+)\)/.exec(text)?.[1]) ?? "0";
          r.onEvent({ type: "info", message: `diagnostic : ${n} anomalie(s), texte copiable sur /diagnostic (journal : /logs)` });
        });
    },
    designs: { list: async () => withStates(await listMemo(), designSteps), read: (n) => store.read(n), steps: () => designSteps },
    designHtml: () => page("design.html"),
    parseBudgetEur,
    panelHtml: () => page("panel.html") ?? "<p>panel.html introuvable</p>",
    assetsDir: here,
    moodboard: memoBy(() => tracked(boardOf("live")), 2000, () => events), onEmit: () => { events++; }, logs: rl.source,
    report: (id) => cardDetail(id, (p) => files.read(p), (p) => files.exists(p), ledger),
    shot: async (rel) => {
      for (const base of [activeDir, o.cwd]) {
        if (base) try { return await readFile(join(base, rel)); } catch { /* couche suivante */ }
      }
      return null; // fusionne = present dans l'arbre principal (sur developpement)
    },
    moodboardHtml: () => page("moodboard.html"),
  });
}
