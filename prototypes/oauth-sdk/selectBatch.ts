/**
 * Choix du lot a partir des verdicts : le code decide, le modele n'a fait que conseiller.
 *
 * Quoi : `selectBatch(cartes, verdicts, { duplicates, done })` renvoie les cartes a implementer et les cartes ecartees
 *        avec une raison structuree (`deferred`: duplicate, split, dependency, needs-design, too-large).
 * Regles : doublon deterministe (dedupe.ts) ou declare -> ecartee; carte L -> decoupee (sous-cartes) ou refusee, jamais
 *        implementee; dependance non terminee -> ecartee; needs_design -> ecartee tant que le design n'a pas eu lieu (`designPending`). Le reste part.
 * Usage : `const { selected, deferred } = selectBatch(lot, verdicts, { duplicates, done })`.
 */
import type { Qualification } from "./qualify";

/** Carte ecartee. */
export interface Deferred { id: string; kind: "duplicate" | "split" | "dependency" | "needs-design" | "too-large"; reason: string }

/** Contexte: doublons deja trouves par le code, ids termines, ids du lot courant. */
export interface SelectCtx { duplicates?: ReadonlyMap<string, string>; done?: ReadonlySet<string>; /** Design pas encore passe: `needs_design` attend (defaut: le design a deja eu lieu, la carte part). */ designPending?: boolean }

/** Applique les regles; l'ordre du lot est conserve. Les cartes retenues portent leurs fichiers et criteres. */
export function selectBatch<T extends { id: string }>(cards: T[], verdicts: ReadonlyMap<string, Qualification>, ctx: SelectCtx = {}): { selected: (T & { files?: string[]; criteria?: string[] })[]; deferred: Deferred[] } {
  const selected: (T & { files?: string[]; criteria?: string[] })[] = [], deferred: Deferred[] = [];
  const ids = new Set(cards.map((c) => c.id));
  for (const c of cards) {
    const q = verdicts.get(c.id);
    const dup = ctx.duplicates?.get(c.id) ?? (q?.decision === "reject_duplicate" ? `doublon declare${q.duplicateOf ? ` de ${q.duplicateOf}` : ""}${q.why ? ` : ${q.why}` : ""}` : undefined);
    if (dup) { deferred.push({ id: c.id, kind: "duplicate", reason: dup }); continue; }
    if (!q) { selected.push(c); continue; }
    const waiting = q.dependsOn.filter((d) => !ctx.done?.has(d) && ids.has(d));
    if (q.decision === "blocked_dependency" || waiting.length) { deferred.push({ id: c.id, kind: "dependency", reason: `depend de ${(waiting.length ? waiting : q.dependsOn).join(", ") || "une carte non terminee"}` }); continue; }
    if (q.decision === "needs_design" && ctx.designPending) { deferred.push({ id: c.id, kind: "needs-design", reason: q.why ?? "interface a concevoir avant l'implementation" }); continue; }
    if (q.decision === "split" || q.size === "L") {
      deferred.push(q.parts.length ? { id: c.id, kind: "split", reason: `decoupee en ${q.parts.length} sous-cartes : ${q.parts.join(" | ")}` } : { id: c.id, kind: "too-large", reason: "carte trop grosse (L) sans decoupe proposee" });
      continue;
    }
    selected.push({ ...c, files: q.files, criteria: q.criteria });
  }
  return { selected, deferred };
}
