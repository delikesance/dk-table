/**
 * Donnees du "moodboard" de recherche : idees groupees par statut (pas une liste chronologique).
 *
 * Quoi : lit docs/recherche/fonctionnalites.md (puces `- **Titre** : texte` des 4 axes) et TODO.md,
 *        renvoie des `MoodCard[]`; un resume Haiku d'une ligne par carte (repli sans LLM).
 * Statuts (appariement deterministe: >= 60 % des mots significatifs (> 3 lettres, accents/casse
 *        ignores) du titre presents dans la ligne de TODO) :
 *   - developing : une tache TODO ouverte `- [ ]` correspond;
 *   - lead       : puce marquee piste/speculatif/hypothese/a confirmer, ou idee seulement citee
 *                  dans une ligne TODO qui n'est pas une tache;
 *   - found      : aucune ligne TODO ne correspond. Une tache deja faite `- [x]` retire la carte.
 * Resume : kind 'summary' (Haiku), 1 tour, sans outil, 0,01 USD max par carte, cartes groupees par
 *        requete, cache (titre+source) dans la Map, cout regle dans le budget partage; ne leve jamais.
 * Usage : `await buildMoodboard({ readFile, query, budget, cache })`.
 */
import { createHash } from "node:crypto";
import type { Budget } from "./budget";
import { MODEL_BY_KIND, type QueryFn } from "./research";

/** Carte du moodboard (contrat avec la vue). */
export interface MoodCard {
  id: string;
  title: string;
  status: "found" | "developing" | "lead";
  axis?: "new" | "missing" | "neglected" | "poor";
  summary: string;
  source: string;
}

/** Dependances injectees. */
export interface MoodDeps {
  readFile: (p: string) => Promise<string>;
  query: QueryFn;
  budget?: Budget;
  cache?: Map<string, string>;
  env?: Record<string, string>;
}

/** Plafond par carte (USD) et taille de lot. */
export const CARD_CAP_USD = 0.01;
const BATCH = 8;
type Axis = NonNullable<MoodCard["axis"]>;
const AXIS_BY_TITLE: [RegExp, Axis][] = [
  [/nouvelles/, "new"], [/absent/, "missing"], [/neglig|sous-utilis/, "neglected"], [/mal impl/, "poor"],
];
const LEAD_RE = /\b(piste|speculatif|speculative|hypothese|a confirmer|non verifie)\b/;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3);

/** Vrai si >= 60 % des mots significatifs du titre sont dans la ligne. */
export function matches(title: string, line: string): boolean {
  const t = words(title);
  if (!t.length) return false;
  const l = new Set(words(line));
  return t.filter((w) => l.has(w)).length / t.length >= 0.6;
}

/** Puces `- **Titre** : texte` avec leur axe (selon le titre de section). */
export function parseResearch(md: string): { title: string; source: string; axis?: Axis }[] {
  const out: { title: string; source: string; axis?: Axis }[] = [];
  let axis: Axis | undefined;
  for (const line of md.split(/\r?\n/)) {
    const h = /^##\s+(.*)/.exec(line);
    if (h) { axis = AXIS_BY_TITLE.find(([re]) => re.test(norm(h[1])))?.[1]; continue; }
    const b = /^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*(.*)$/.exec(line);
    if (b) out.push({ title: b[1].trim(), source: b[2].trim(), axis });
  }
  return out;
}

/** Statut d'une idee d'apres les lignes de TODO.md; `null` si deja realisee. */
export function statusOf(title: string, source: string, todo: string[]): MoodCard["status"] | null {
  const hits = todo.filter((l) => matches(title, l));
  if (hits.some((l) => /^\s*-\s*\[ \]/.test(l))) return "developing";
  if (hits.some((l) => /^\s*-\s*\[[xX]\]/.test(l))) return null;
  if (hits.length || LEAD_RE.test(norm(source))) return "lead";
  return "found";
}

/** Repli sans LLM : premiere phrase, coupee a 80 caracteres. */
export function fallbackSummary(source: string): string {
  const s = source.replace(/\s+/g, " ").trim();
  const first = /^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s;
  return first.length > 80 ? first.slice(0, 79).trimEnd() + "…" : first;
}

const keyOf = (c: { title: string; source: string }) =>
  createHash("sha1").update(c.title + "\u0000" + c.source).digest("hex");

/** Resume les cartes hors cache par lots et remplit `cache`; ne leve jamais. */
async function summarize(cards: MoodCard[], d: MoodDeps, cache: Map<string, string>): Promise<void> {
  const todo = cards.filter((c) => !cache.has(keyOf(c)));
  if (d.env && !d.env.CLAUDE_CODE_OAUTH_TOKEN) return;
  for (let i = 0; i < todo.length; i += BATCH) {
    const lot = todo.slice(i, i + BATCH);
    if (d.budget?.exhausted()) return;
    const want = CARD_CAP_USD * lot.length;
    const granted = d.budget ? d.budget.reserve(want) : want;
    if (granted <= 0) return;
    let cost = 0, text = "";
    try {
      const prompt = "Pour chaque idee, ecris en francais UNE ligne de 15 mots maximum, sans markdown. " +
        'Reponds uniquement par des lignes "numero|resume".\n' +
        lot.map((c, n) => `${n + 1}. ${c.title} : ${c.source.slice(0, 400)}`).join("\n");
      const stream = d.query({ prompt, options: {
        model: MODEL_BY_KIND.summary, maxTurns: 1, maxBudgetUsd: granted, tools: [], allowedTools: [],
        permissionMode: "dontAsk", settingSources: [], env: d.env } });
      for await (const m of stream) {
        if (m.type !== "result") continue;
        cost += m.total_cost_usd ?? 0;
        if (m.subtype === "success") text = m.result ?? "";
      }
    } catch { text = ""; }
    d.budget?.settle(granted, cost);
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*(\d+)\s*[|.:]\s*(.+)$/.exec(line);
      const c = m && lot[Number(m[1]) - 1];
      if (c && m[2].trim()) cache.set(keyOf(c), m[2].trim());
    }
  }
}

/** Construit le moodboard; ne leve jamais (fichier illisible -> liste vide). */
export async function buildMoodboard(d: MoodDeps): Promise<MoodCard[]> {
  const read = (p: string) => d.readFile(p).catch(() => "");
  const [md, todoText] = await Promise.all([read("docs/recherche/fonctionnalites.md"), read("TODO.md")]);
  const todo = todoText.split(/\r?\n/);
  const cards: MoodCard[] = [];
  for (const r of parseResearch(md)) {
    const status = statusOf(r.title, r.source, todo);
    if (!status) continue;
    const id = norm(r.title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    cards.push({ id, title: r.title, status, axis: r.axis, summary: "", source: r.source });
  }
  const cache = d.cache ?? new Map<string, string>();
  try { await summarize(cards, d, cache); } catch { /* repli ci-dessous */ }
  for (const c of cards) c.summary = cache.get(keyOf(c)) ?? fallbackSummary(c.source);
  return cards;
}
