/**
 * Consigne de rapport et de preuves donnee a l'agent d'implementation (une tournee = un lot de cartes).
 *
 * Quoi : `reportRules(lot)` rend le texte ajoute au prompt : TDD, rapport `docs/rapports/<id>.md`,
 *        captures, zero question (les doutes vont au sous-agent `trancheur`).
 * Pourquoi : une carte n'est terminee que si les preuves ECRITES PAR LE CODE (proveReport.ts) sont vertes (card.ts / cards.ts).
 * Le lot lui-meme est choisi par le planificateur (rounds.ts) puis qualifie (qualifyStep.ts): une seule source.
 * Usage : `reportRules(lot)`.
 */
import { reportTemplate } from "./card";
import type { BoardCard } from "./cards";

/** Texte a ajouter au prompt d'implementation pour ce lot. */
export function reportRules(batch: (Pick<BoardCard, "id" | "title" | "source" | "state"> & { missing?: string[]; files?: string[]; criteria?: string[] })[]): string {
  const list = batch.map((c) => `- ${c.id} (${c.state}, rapport docs/rapports/${c.id}.md) : ${c.title} — ${c.source.slice(0, 300)}` +
    (c.files?.length ? ` — fichiers probables : ${c.files.join(", ")}` : "") + (c.criteria?.length ? ` — criteres d'acceptation : ${c.criteria.join(" ; ")}` : "") +
    (c.missing?.includes("rapport") ? " — DEJA IMPLEMENTEE (TODO coche) : ne la recode pas; verifie dans le code et les tests existants, ecris seulement le rapport et les preuves." : "")).join("\n");
  return [
    "Cartes a traiter dans cette tournee (traite-les toutes) :", list, "",
    "Pour CHAQUE carte, des le debut puis a chaque etape, tiens a jour `docs/rapports/<id>.md` (gabarit ci-dessous, ecris-le avant de coder) :",
    "1. TDD : ecris d'abord un test qui echoue, lance-le seul (`npx vitest run <fichier de test>`), puis implemente jusqu'au vert; la boucle lance ensuite les tests lies puis la suite complete du lot.",
    "2. Si la carte a un effet visible : capture Playwright (viewport 1200x800, `?onboarding=0`, clair ET sombre) dans docs/screenshots/<id>/, chemins listes sous `## Captures` (depuis la racine du depot) ; sinon ecris `Visible : non`.",
    "3. N'ecris NI `Statut`, NI `## Preuves`, NI les resultats de tests, NI TODO.md : la boucle lance tests et tsc, ecrit les preuves, le statut et coche TODO.md apres la fusion.",
    "4. `## Non fait` = seulement ce qui reste a faire DANS cette carte (ses criteres; la carte sera reprise tant que la section n'est pas vide). Ce qui est hors de la carte (autre carte, hors criteres, suite possible, limite connue) va sous `## Decisions`, jamais sous `## Non fait`. Si tu ne peux pas finir, ecris la raison sous `## Bloque`.",
    "Aucune question a l'utilisateur, jamais de question : devant un doute, delegue-le au sous-agent `trancheur` (outil Agent), applique sa decision et note-la sous `## Decisions`.",
    "Utilise les skills et outils disponibles quand ils aident.", "",
    "Gabarit du rapport :", "```", reportTemplate("<titre de la carte>"), "```",
  ].join("\n");
}
