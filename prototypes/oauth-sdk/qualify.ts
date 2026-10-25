/**
 * Qualification des cartes d'un lot : UN appel modele (mode helper, sans outil) pour tout le lot.
 *
 * Quoi : pour chaque carte, taille S/M/L, fichiers cibles, criteres d'acceptation, dependances, doublon et decision
 *        (implement, split, reject_duplicate, blocked_dependency, needs_design). Reponse en JSON, validee ici a la main
 *        (`parseQualifications`): sortie structuree du SDK demandee quand elle existe, jamais necessaire.
 * Pourquoi : une carte trop grosse, redondante ou dependante coute un agent entier pour rien; on la voit avant de payer.
 * Garde-fous : toute reponse absente, invalide ou en echec donne `implement` / taille M (comportement d'avant);
 *        une carte L n'est jamais implementee telle quelle; resultats mis en cache (hash du titre + resume) dans .boucle/qualif.json.
 * Usage : `await qualifyCards(lot, { ask, cache })` -> Map<id, Qualification>.
 */
import { createHash } from "node:crypto";

export type Decision = "implement" | "split" | "reject_duplicate" | "blocked_dependency" | "needs_design";
export const DECISIONS: Decision[] = ["implement", "split", "reject_duplicate", "blocked_dependency", "needs_design"];

/** Verdict sur une carte. */
export interface Qualification {
  id: string; size: "S" | "M" | "L"; files: string[]; criteria: string[]; dependsOn: string[];
  duplicateOf?: string; decision: Decision;
  /** Sous-cartes proposees quand la decision est `split` (titres courts). */
  parts: string[]; why?: string;
}

/** Carte soumise. */
export interface QCard { id: string; title: string; summary: string; source: string }

/** Schema JSON de la reponse (sortie structuree du SDK). */
export const QUALIF_SCHEMA = {
  type: "object", required: ["cards"],
  properties: { cards: { type: "array", items: {
    type: "object", required: ["id", "size", "decision"],
    properties: {
      id: { type: "string" }, size: { enum: ["S", "M", "L"] }, files: { type: "array", items: { type: "string" } },
      criteria: { type: "array", items: { type: "string" } }, dependsOn: { type: "array", items: { type: "string" } },
      duplicateOf: { type: "string" }, decision: { enum: DECISIONS }, parts: { type: "array", items: { type: "string" } }, why: { type: "string" },
    },
  } } },
};

/** Verdict par defaut (reponse manquante): on garde le comportement d'avant. */
export const fallbackQualification = (id: string): Qualification => ({ id, size: "M", files: [], criteria: [], dependsOn: [], decision: "implement", parts: [] });

const strs = (v: unknown, max = 12) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 300)).slice(0, max) : []);

/** Extrait et valide le JSON (texte brut, bloc ```json ou objet deja analyse); les entrees invalides sont ecartees. */
export function parseQualifications(raw: unknown, ids: string[]): Map<string, Qualification> {
  const out = new Map<string, Qualification>();
  let data: unknown = raw;
  if (typeof raw === "string") {
    const m = /\{[\s\S]*\}/.exec(raw);
    try { data = m ? JSON.parse(m[0]) : null; } catch { data = null; }
  }
  const list = (data as { cards?: unknown })?.cards;
  if (!Array.isArray(list)) return out;
  for (const e of list) {
    if (typeof e !== "object" || e === null) continue;
    const q = e as Record<string, unknown>;
    if (typeof q.id !== "string" || !ids.includes(q.id) || out.has(q.id)) continue;
    if (!DECISIONS.includes(q.decision as Decision) || !["S", "M", "L"].includes(q.size as string)) continue;
    out.set(q.id, {
      id: q.id, size: q.size as Qualification["size"], decision: q.decision as Decision, files: strs(q.files), criteria: strs(q.criteria),
      dependsOn: strs(q.dependsOn).filter((d) => d !== q.id), parts: strs(q.parts, 6),
      duplicateOf: typeof q.duplicateOf === "string" ? q.duplicateOf : undefined, why: typeof q.why === "string" ? q.why.slice(0, 300) : undefined,
    });
  }
  return out;
}

/** Consigne du lot (courte: le modele n'a besoin que des cartes). */
export function qualifyPrompt(cards: QCard[]): string {
  const list = cards.map((c) => `- id=${c.id} | ${c.title} | ${c.summary.slice(0, 300)}`).join("\n");
  return "Qualifie ces cartes d'un tableur (une carte = une fonctionnalite). Pour chacune : size S (< 1 fichier source, quelques tests), M (2-4 fichiers), L (plus : a decouper); " +
    "files = fichiers sources probables; criteria = 2-4 criteres testables; dependsOn = ids de cartes de la liste dont elle depend; " +
    "decision = implement | split (L, avec parts = 2-4 sous-cartes) | reject_duplicate (duplicateOf = id) | blocked_dependency | needs_design (UI a concevoir avant). " +
    'Reponds par un seul objet JSON {"cards":[...]} sans autre texte.\n' + list;
}

/** Cache disque des verdicts (injecte: Map en test). */
export interface QualifCache { get(key: string): Qualification | undefined; set(key: string, q: Qualification): void }

/** Cle de cache: contenu de la carte (un rapport ou un resume change = nouveau verdict). */
export const cacheKey = (c: QCard) => createHash("sha1").update(`${c.id}|${c.title}|${c.summary}`).digest("hex").slice(0, 16);

/** Dependances: `ask` envoie la consigne (+ schema) et renvoie le texte ou l'objet; `null` si l'appel echoue. */
export interface QualifyDeps { ask: (prompt: string, schema: object) => Promise<unknown | null>; cache?: QualifCache }

/** Qualifie le lot (une requete pour les cartes hors cache); ne leve jamais. */
export async function qualifyCards(cards: QCard[], d: QualifyDeps): Promise<Map<string, Qualification>> {
  const out = new Map<string, Qualification>();
  const todo: QCard[] = [];
  for (const c of cards) { const hit = d.cache?.get(cacheKey(c)); if (hit) out.set(c.id, { ...hit, id: c.id }); else todo.push(c); }
  if (todo.length) {
    const got = parseQualifications(await d.ask(qualifyPrompt(todo), QUALIF_SCHEMA).catch(() => null), todo.map((c) => c.id));
    for (const c of todo) { const q = got.get(c.id); if (q) { out.set(c.id, q); d.cache?.set(cacheKey(c), q); } }
  }
  for (const c of cards) if (!out.has(c.id)) out.set(c.id, fallbackQualification(c.id));
  return out;
}
