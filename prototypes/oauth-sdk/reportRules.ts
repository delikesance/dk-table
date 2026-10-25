/**
 * Consigne de rapport et de preuves donnee a l'agent d'implementation (une tournee = un lot de cartes).
 *
 * Quoi : `pickBatch(cartes)` choisit les cartes a traiter (reprise des cartes commencees d'abord),
 *        `reportRules(lot)` rend le texte ajoute au prompt : TDD, rapport `docs/rapports/<id>.md`,
 *        captures, zero question (les doutes vont au sous-agent `trancheur`).
 * Pourquoi : une carte n'est terminee que si son rapport prouve le travail (card.ts / cards.ts).
 * Usage : `reportRules(pickBatch(board))`.
 */
import { reportTemplate } from "./card";
import type { BoardCard } from "./cards";

/** Cartes traitees par tournee (contexte de l'agent borne). */
export const MAX_BATCH = 6;

/** Rang de reprise: les cartes deja commencees passent avant les nouvelles. */
const RANK: Record<string, number> = { preuves: 0, "en-cours": 1, bloque: 2, piste: 3, idee: 4 };

/** Lot de la tournee: cartes non terminees, les plus avancees d'abord. */
export function pickBatch<T extends Pick<BoardCard, "state">>(cards: T[]): T[] {
  return cards.filter((c) => c.state !== "termine")
    .sort((a, b) => (RANK[a.state] ?? 9) - (RANK[b.state] ?? 9)).slice(0, MAX_BATCH);
}

/** Texte a ajouter au prompt d'implementation pour ce lot. */
export function reportRules(batch: Pick<BoardCard, "id" | "title" | "source" | "state"> & { missing?: string[] }[]): string {
  const list = batch.map((c) => `- ${c.id} (${c.state}, rapport docs/rapports/${c.id}.md) : ${c.title} — ${c.source.slice(0, 300)}` +
    (c.missing?.includes("rapport") ? " — DEJA IMPLEMENTEE (TODO coche) : ne la recode pas; verifie dans le code et les tests existants, ecris seulement le rapport et les preuves." : "")).join("\n");
  return [
    "Cartes a traiter dans cette tournee (traite-les toutes) :", list, "",
    "Pour CHAQUE carte, des le debut puis a chaque etape, tiens a jour `docs/rapports/<id>.md` (gabarit ci-dessous, ecris-le avant de coder) :",
    "1. TDD : ecris d'abord un test qui echoue, lance `npm test`, puis implemente jusqu'au vert.",
    "2. Si la carte a un effet visible : capture Playwright (viewport 1200x800, `?onboarding=0`, clair ET sombre) dans docs/screenshots/<id>/ ; sinon ecris `Visible : non`.",
    "3. Preuves : `- Tests : ok (N tests)` et `- Captures : chemin1.png, chemin2.png` (chemins depuis la racine du depot).",
    "4. `Statut : termine` seulement si les tests sont verts et les captures existent; sinon `Statut : bloque` et la raison sous `## Non fait`.",
    "5. Mets TODO.md a jour (coche la tache).",
    "Aucune question a l'utilisateur, jamais de question : devant un doute, delegue-le au sous-agent `trancheur` (outil Agent), applique sa decision et note-la sous `## Decisions`.",
    "Utilise les skills et outils disponibles quand ils aident.", "",
    "Gabarit du rapport :", "```", reportTemplate("<titre de la carte>"), "```",
  ].join("\n");
}
