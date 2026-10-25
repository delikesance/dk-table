/**
 * Etat persistant du run : `.boucle/state.json` (ignore par git).
 *
 * Quoi : essais par carte, derniere raison de refus, modeles utilises par essai, branche/worktree retenus, session SDK,
 *        liste `avoid`, etat du planificateur et budget consomme. `createFileStateStore(path)` -> `{ load, update }`.
 * Pourquoi : reprendre apres un crash sans repartir de zero (essais, branches refusees, rotation des cartes).
 * Garanties : ecriture atomique (fichier temporaire puis rename), version de schema, validation au chargement. Un fichier
 *        corrompu ou d'une autre version n'arrete jamais le run : il est copie en `.corrupt-<ts>`, signale par `onWarn`, et le
 *        run repart d'un etat vide. Les reservations de budget en vol ne sont jamais reprises. Aucune exception ne sort.
 * Usage : `const st = createFileStateStore(join(cwd, ".boucle", "state.json"), { onWarn }); st.update((s) => { s.cards.a = {...} })`.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Version du schema ecrit sur disque. */
export const STATE_VERSION = 1;

/** Memoire d'une carte entre deux essais. */
export interface CardRun {
  tries: number;
  models: string[];
  lastReason?: string;
  /** Branche et worktree retenus apres un refus de fusion (reutilises par l'essai suivant). */
  branch?: string;
  dir?: string;
  /** Session SDK de l'agent dans ce worktree (reprise de l'essai suivant). */
  sessionId?: string;
  /** Carte ecartee par le code (max d'essais, doublon, dependance, decoupe) avec sa raison structuree. */
  deferred?: { kind: string; reason: string };
}

/** Etat du planificateur (voir rounds.ts). */
export interface PlannerState { fails: Record<string, number>; seen: Record<string, number>; idle: number; rounds: number }

/** Etat complet d'un run. */
export interface RunState {
  version: number;
  runId: string;
  cards: Record<string, CardRun>;
  avoid: string[];
  planner: PlannerState;
  budget: { spentUsd: number; reservedUsd: number };
  /** Fusions locales non poussees (le run suivant relance la suite complete avant de pousser). */
  unpushed: boolean;
  /** Vrai une fois le run termine proprement; faux = run interrompu, le suivant reprend cet etat. */
  finished: boolean;
}

/** Etat vide (premier run, ou fichier ecarte). */
export const emptyState = (runId: string): RunState => ({
  version: STATE_VERSION, runId, cards: {}, avoid: [],
  planner: { fails: {}, seen: {}, idle: 0, rounds: 0 }, budget: { spentUsd: 0, reservedUsd: 0 }, unpushed: false, finished: true,
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const numMap = (v: unknown): Record<string, number> =>
  Object.fromEntries(Object.entries(isObj(v) ? v : {}).filter(([, n]) => typeof n === "number" && Number.isFinite(n)) as [string, number][]);

/** Valide un contenu lu sur disque; `null` si la forme ou la version ne convient pas. Champs douteux ecartes. */
export function parseState(raw: unknown): RunState | null {
  if (!isObj(raw) || raw.version !== STATE_VERSION) return null;
  const s = emptyState(str(raw.runId) ?? "");
  for (const [id, c] of Object.entries(isObj(raw.cards) ? raw.cards : {})) {
    if (!isObj(c) || typeof c.tries !== "number" || !Number.isFinite(c.tries) || c.tries < 0) continue;
    const d = isObj(c.deferred) && str(c.deferred.kind) && str(c.deferred.reason) ? { kind: c.deferred.kind as string, reason: c.deferred.reason as string } : undefined;
    s.cards[id] = {
      tries: c.tries, models: Array.isArray(c.models) ? c.models.filter((m): m is string => typeof m === "string") : [],
      lastReason: str(c.lastReason), branch: str(c.branch), dir: str(c.dir), sessionId: str(c.sessionId), deferred: d,
    };
  }
  s.avoid = Array.isArray(raw.avoid) ? raw.avoid.filter((a): a is string => typeof a === "string") : [];
  const p = isObj(raw.planner) ? raw.planner : {};
  s.planner = { fails: numMap(p.fails), seen: numMap(p.seen), idle: num(p.idle), rounds: num(p.rounds) };
  s.budget = { spentUsd: num(isObj(raw.budget) ? raw.budget.spentUsd : 0), reservedUsd: 0 };
  s.unpushed = raw.unpushed === true;
  s.finished = raw.finished !== false;
  return s;
}

/** Magasin d'etat. */
export interface StateStore {
  load(): RunState;
  /** Applique `fn` a l'etat courant et l'ecrit (atomique); ne leve jamais. */
  update(fn: (s: RunState) => void): RunState;
}

/** Magasin sur disque; `onWarn` recoit les problemes (corruption, ecriture impossible). */
export function createFileStateStore(path: string, o: { onWarn?: (msg: string) => void; now?: () => number } = {}): StateStore {
  const warn = (m: string) => { try { o.onWarn?.(m); } catch { /* le journal ne doit jamais casser le run */ } };
  const now = o.now ?? Date.now;
  let cache: RunState | null = null;
  const load = (): RunState => {
    if (cache) return cache;
    let text: string;
    try { text = readFileSync(path, "utf-8"); } catch { return (cache = emptyState("")); } // absent: premier run
    const parsed = (() => { try { return parseState(JSON.parse(text)); } catch { return null; } })();
    if (!parsed) {
      const copy = `${path}.corrupt-${now()}`;
      try { renameSync(path, copy); } catch { /* copie impossible: on continue quand meme */ }
      warn(`state.json illisible ou de version inconnue, ignore (copie : ${copy}); etat vide`);
      return (cache = emptyState(""));
    }
    return (cache = parsed);
  };
  const save = (s: RunState) => {
    try {
      mkdirSync(dirname(path), { recursive: true });
      const tmp = `${path}.tmp-${process.pid}`;
      writeFileSync(tmp, JSON.stringify(s));
      renameSync(tmp, path);
    } catch (e) { warn(`state.json non ecrit : ${(e as Error).message}`); }
  };
  return {
    load,
    update(fn) { const s = load(); fn(s); save(s); return s; },
  };
}
