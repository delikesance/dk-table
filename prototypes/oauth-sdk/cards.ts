/**
 * Tableau des cartes : moodboard + rapports d'agents -> etat de chaque carte.
 *
 * Quoi : pour chaque idee (moodboard.ts), lit `docs/rapports/<id>.md`, le valide (card.ts) et
 *        calcule l'etat (idee, piste, en-cours, preuves, termine, bloque).
 * Pourquoi : la boucle n'est terminee que lorsque toutes les cartes sont `termine` (rapport
 *        complet, tests verts, captures presentes); la vue affiche le rapport en direct.
 * Usage : `await buildBoard({ readFile, query, exists })`, `allDone(cartes)`, `reportPath(id)`.
 */
import { parseReport, validateReport, type CardState, type Report } from "./card";
import { reconcileCard } from "./reconcile";
import type { DoneEntry, DoneLedger } from "./doneLedger";
import { hashOf, type StaleStore } from "./stale";
import { buildMoodboard, type MoodCard, type MoodDeps } from "./moodboard";

/** Carte enrichie de son etat et de son rapport. */
export interface BoardCard extends MoodCard {
  state: CardState;
  reportPath: string;
  report?: Report;
  /** Preuves manquantes d'un rapport declare termine. */
  missing: string[];
  /** Incoherences detectees par le reconciliateur (orpheline, finie sans rapport...). */
  anomalies: string[];
  /** Raison structuree d'un blocage decide par le code (limite d'essais...): la carte est `bloque` et n'est plus traitee. */
  blockReason?: string;
}

/** Dependances: celles du moodboard + test d'existence d'un fichier (captures). */
export type BoardDeps = MoodDeps & { exists: (path: string) => Promise<boolean>; /** Registre des cartes terminees (jamais perdues). */ ledger?: DoneLedger; /** Rapports perimes (ignores, voir stale.ts). */ stale?: StaleStore; /** Ids des cartes du lot en cours de traitement (aucune hors tournee). */ active?: ReadonlySet<string>; /** Cartes ecartees par le code (id -> raison), lues dans .boucle/state.json. */ deferred?: () => ReadonlyMap<string, { kind: string; reason: string }> };

/** Carte terminee reconstituee depuis le registre. */
const fromLedger = (e: DoneEntry): BoardCard => ({
  id: e.id, title: e.title, status: "found", axis: e.axis, summary: e.summary, source: e.source,
  state: "termine", reportPath: e.reportPath, report: parseReport(e.markdown), missing: [], anomalies: [],
});

/** Chemin du rapport d'une carte (relatif a la racine du depot). */
export const reportPath = (id: string) => `docs/rapports/${id}.md`;

/** Construit le tableau; ne leve jamais (rapport illisible = carte sans rapport). */
export async function buildBoard(d: BoardDeps): Promise<BoardCard[]> {
  const cards = await buildMoodboard(d);
  const kept = new Map((await d.ledger?.load().catch(() => [] as DoneEntry[]) ?? []).map((e) => [e.id, e]));
  const retired = await d.stale?.hashes().catch(() => new Map<string, string>()) ?? new Map<string, string>();
  const live = await Promise.all(cards.map(async (c): Promise<BoardCard & { markdown?: string }> => {
    const path = reportPath(c.id);
    let md = await d.readFile(path).catch(() => "");
    if (md && retired.get(c.id) === hashOf(md)) md = ""; // rapport perime et archive: la carte repart propre
    const report = md ? parseReport(md) : undefined;
    const known = new Set<string>();
    await Promise.all((report?.screenshots ?? []).map(async (p) => { if (await d.exists(p).catch(() => false)) known.add(p); }));
    const proof = report ? validateReport(report, (p) => known.has(p)) : { ok: true, missing: [] };
    const r = reconcileCard({ status: c.status, report, proof, active: !!d.active?.has(c.id), ledgered: kept.has(c.id), proven: !!report?.proof });
    if (kept.has(c.id) && !(report?.status === "termine" && proof.ok)) return { ...fromLedger(kept.get(c.id)!), axis: c.axis ?? kept.get(c.id)!.axis };
    const stop = r.state !== "termine" ? d.deferred?.().get(c.id) : undefined;
    if (stop) return { ...c, report, ...r, state: "bloque", anomalies: [...r.anomalies, `bloquee (${stop.kind}) : ${stop.reason}`], blockReason: stop.reason, reportPath: path, markdown: md || undefined };
    return { ...c, report, ...r, reportPath: path, markdown: md || undefined };
  }));
  if (!d.ledger) return live;
  for (const c of live) {
    if (c.state === "termine" && c.markdown) {
      await d.ledger.record({ id: c.id, title: c.title, summary: c.summary, source: c.source, axis: c.axis, reportPath: c.reportPath, markdown: c.markdown, doneAt: Date.now() });
    }
  }
  const seen = new Set(live.map((c) => c.id));
  return [...live.map(({ markdown: _m, ...c }) => c), ...[...kept.values()].filter((e) => !seen.has(e.id)).map(fromLedger)];
}

/** Boucle terminee : toutes les cartes sont `termine` (aucune carte = rien a faire). */
export const allDone = (cards: { state: CardState }[]) => cards.every((c) => c.state === "termine");

/** Rapport d'une carte pour la vue: texte brut, analyse, etat et preuves manquantes; `null` si absent. */
export async function cardDetail(
  id: string, read: (path: string) => Promise<string | null>, exists: (path: string) => Promise<boolean>, ledger?: DoneLedger,
): Promise<{ id: string; markdown: string; report: Report; state: CardState; missing: string[] } | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const saved = (await ledger?.load().catch(() => []))?.find((e) => e.id === id);
  const markdown = saved?.markdown ?? (await read(reportPath(id)));
  if (!markdown) return null;
  const report = parseReport(markdown);
  const known = new Set<string>();
  await Promise.all(report.screenshots.map(async (p) => { if (await exists(p).catch(() => false)) known.add(p); }));
  const v = validateReport(report, (p) => known.has(p));
  const r = reconcileCard({ status: "found", report, proof: v, active: true, ledgered: !!saved });
  return { id, markdown, report, state: r.state, missing: r.missing };
}
