/**
 * Tableau des cartes : moodboard + rapports d'agents -> etat de chaque carte.
 *
 * Quoi : pour chaque idee (moodboard.ts), lit `docs/rapports/<id>.md`, le valide (card.ts) et
 *        calcule l'etat (idee, piste, en-cours, preuves, termine, bloque).
 * Pourquoi : la boucle n'est terminee que lorsque toutes les cartes sont `termine` (rapport
 *        complet, tests verts, captures presentes); la vue affiche le rapport en direct.
 * Usage : `await buildBoard({ readFile, query, exists })`, `allDone(cartes)`, `reportPath(id)`.
 */
import { cardState, parseReport, validateReport, type CardState, type Report } from "./card";
import { buildMoodboard, type MoodCard, type MoodDeps } from "./moodboard";

/** Carte enrichie de son etat et de son rapport. */
export interface BoardCard extends MoodCard {
  state: CardState;
  reportPath: string;
  report?: Report;
  /** Preuves manquantes d'un rapport declare termine. */
  missing: string[];
}

/** Dependances: celles du moodboard + test d'existence d'un fichier (captures). */
export type BoardDeps = MoodDeps & { exists: (path: string) => Promise<boolean> };

/** Chemin du rapport d'une carte (relatif a la racine du depot). */
export const reportPath = (id: string) => `docs/rapports/${id}.md`;

/** Construit le tableau; ne leve jamais (rapport illisible = carte sans rapport). */
export async function buildBoard(d: BoardDeps): Promise<BoardCard[]> {
  const cards = await buildMoodboard(d);
  return Promise.all(cards.map(async (c): Promise<BoardCard> => {
    const path = reportPath(c.id);
    const md = await d.readFile(path).catch(() => "");
    if (!md) return { ...c, state: c.status === "developing" ? "en-cours" : cardState(undefined, c.status === "lead"), reportPath: path, missing: [] };
    const report = parseReport(md);
    const known = new Set<string>();
    await Promise.all(report.screenshots.map(async (p) => { if (await d.exists(p).catch(() => false)) known.add(p); }));
    const v = validateReport(report, (p) => known.has(p));
    return { ...c, report, state: cardState(report, c.status === "lead", v), reportPath: path, missing: v.missing };
  }));
}

/** Boucle terminee : toutes les cartes sont `termine` (aucune carte = rien a faire). */
export const allDone = (cards: { state: CardState }[]) => cards.every((c) => c.state === "termine");

/** Rapport d'une carte pour la vue: texte brut, analyse, etat et preuves manquantes; `null` si absent. */
export async function cardDetail(
  id: string, read: (path: string) => Promise<string | null>, exists: (path: string) => Promise<boolean>,
): Promise<{ id: string; markdown: string; report: Report; state: CardState; missing: string[] } | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const markdown = await read(reportPath(id));
  if (!markdown) return null;
  const report = parseReport(markdown);
  const known = new Set<string>();
  await Promise.all(report.screenshots.map(async (p) => { if (await exists(p).catch(() => false)) known.add(p); }));
  const v = validateReport(report, (p) => known.has(p));
  return { id, markdown, report, state: cardState(report, false, v), missing: v.missing };
}
