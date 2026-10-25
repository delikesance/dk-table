/**
 * Etape de qualification branchee dans les tournees (rounds.ts `qualify`).
 *
 * Quoi : `createQualifier(deps)` -> `qualify(lot)`: doublons deterministes (dedupe.ts: cartes terminees, TODO.md, meme lot),
 *        puis UN appel modele pour les cartes restantes (qualify.ts, mode helper, sortie JSON structuree du SDK avec repli sur
 *        le texte), `selectBatch`; les cartes L decoupees ajoutent leurs sous-cartes a fonctionnalites.md (commit `[boucle-docs]`).
 * Pourquoi : ne pas payer un agent entier pour une carte redondante, trop grosse ou dependante.
 * Garde-fous : budget reserve/regle comme les autres requetes; sans jeton, budget epuise, echec ou reponse invalide : verdicts
 *        par defaut (comportement d'avant); verdicts en cache dans `.boucle/qualif.json`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Budget } from "./budget";
import type { BoardCard } from "./cards";
import { doneTitles, findDuplicates, type Known } from "./dedupe";
import { modelFor } from "./routing";
import { qualifyCards, type QualifCache, type Qualification } from "./qualify";
import type { QueryFn } from "./research";
import { selectBatch, type Deferred } from "./selectBatch";
import { addSubcards } from "./split";

/** Plafond d'une qualification (USD). */
export const QUALIFY_CAP_USD = 0.1;
const FICHES = "docs/recherche/fonctionnalites.md";

/** Cache disque tolerant (fichier absent ou illisible = cache vide, ecriture ratee ignoree). */
export function createFileQualifCache(path: string): QualifCache {
  let data: Record<string, Qualification> | undefined;
  const load = () => data ??= (() => { try { const j = JSON.parse(readFileSync(path, "utf8")); return j && typeof j === "object" ? j as Record<string, Qualification> : {}; } catch { return {}; } })();
  return {
    get: (k) => load()[k],
    set: (k, q) => { load()[k] = q; try { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(data)); } catch { /* cache facultatif */ } },
  };
}

/** Dependances. */
export interface QualifierDeps {
  query: QueryFn; budget: Budget; env?: Record<string, string>;
  read: (path: string) => Promise<string | null>;
  /** Titres des cartes terminees (registre .boucle/termines.jsonl). */
  doneTitles: () => Promise<string[]>;
  commitDocs: (files: { path: string; text: string }[], message: string) => Promise<string | null>;
  cache?: QualifCache; emit: (message: string) => void;
}

/** Un appel helper en JSON structure; `null` si indisponible. */
function asker(d: QualifierDeps) {
  return async (prompt: string, schema: object): Promise<unknown | null> => {
    if (d.env && !d.env.CLAUDE_CODE_OAUTH_TOKEN) return null;
    if (d.budget.exhausted()) return null;
    const granted = d.budget.reserve(QUALIFY_CAP_USD);
    if (granted <= 0) return null;
    let cost = 0, out: unknown = null;
    try {
      const stream = d.query({ prompt, options: {
        model: modelFor("qualify", 0), maxTurns: 2, maxBudgetUsd: granted, tools: [], allowedTools: [], permissionMode: "dontAsk", settingSources: [], env: d.env,
        outputFormat: { type: "json_schema", schema },
      } });
      for await (const m of stream) {
        if (m.type !== "result") continue;
        cost += m.total_cost_usd ?? 0;
        if (m.subtype === "success") out = (m as { structured_output?: unknown }).structured_output ?? m.result ?? null;
      }
    } catch { out = null; }
    d.budget.settle(granted, cost);
    return out;
  };
}

/** Construit `qualify(lot)` pour runRounds. */
export function createQualifier(d: QualifierDeps) {
  const ask = asker(d);
  return async (batch: BoardCard[]): Promise<{ selected: BoardCard[]; deferred: Deferred[] }> => {
    const known: Known[] = [...(await d.doneTitles()).map((title) => ({ title, where: "termines.jsonl" })), ...doneTitles((await d.read("TODO.md")) ?? "")];
    const duplicates = findDuplicates(batch, known);
    const rest = batch.filter((c) => !duplicates.has(c.id));
    const verdicts = rest.length ? await qualifyCards(rest, { ask, cache: d.cache }) : new Map<string, Qualification>();
    const r = selectBatch(batch, verdicts, { duplicates });
    for (const x of r.deferred.filter((y) => y.kind === "split")) {
      const q = verdicts.get(x.id), parent = batch.find((b) => b.id === x.id);
      const md = await d.read(FICHES);
      const next = q && parent && md ? addSubcards(md, parent.title, q.parts) : null;
      const hash = next ? await d.commitDocs([{ path: FICHES, text: next }], `Boucle: decoupe de la carte ${x.id}`) : null;
      d.emit(hash ? `carte ${x.id} decoupee en ${q!.parts.length} sous-cartes (commit ${hash})` : `carte ${x.id} a decouper : sous-cartes non ecrites (${FICHES} introuvable ou deja a jour)`);
    }
    return r;
  };
}
