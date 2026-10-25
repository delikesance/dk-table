/**
 * Cartes independantes : lesquelles peuvent etre traitees en meme temps par des agents distincts.
 *
 * Quoi : `touches(carte)` = chemins cites (fichiers, dossiers) dans son titre, sa source et son resume;
 *        `splitParallel(cartes, avoid)` separe `par` (aucun chemin en commun, a lancer ensemble) de `ser`
 *        (chevauchement annonce ou conflit precedent, a traiter l'une apres l'autre).
 * Pourquoi : deux agents qui modifient le meme fichier se marchent dessus a la fusion. On evite ce qu'on peut prevoir;
 *        le reste est rattrape a la fusion (conflit detecte, carte relancee en serie, voir parallel.ts).
 * Usage : `const { par, ser } = splitParallel(lot, conflicted)`.
 */
import type { BoardCard } from "./cards";

type Card = Pick<BoardCard, "id" | "title" | "source" | "summary">;

const PATH = /[\w@.-]+(?:\/[\w@.-]+)+\/?|[\w-]+\.(?:ts|tsx|js|css|md|json|html)\b/g;

/** Chemins annonces par la carte (sans doublon). */
export function touches(c: Card): Set<string> {
  const out = new Set<string>();
  for (const m of `${c.title} ${c.source} ${c.summary}`.matchAll(PATH)) out.add(m[0]);
  return out;
}

/** Deux chemins se chevauchent s'ils sont egaux ou si l'un est un dossier qui contient l'autre. */
const overlap = (a: string, b: string) => a === b || (a.endsWith("/") && b.startsWith(a)) || (b.endsWith("/") && a.startsWith(b));

/** Separe les cartes a lancer ensemble de celles a traiter en serie (ordre conserve). */
export function splitParallel<T extends Card>(cards: T[], avoid: ReadonlySet<string> = new Set()): { par: T[]; ser: T[] } {
  const par: T[] = [], ser: T[] = [];
  const taken: string[] = [];
  for (const c of cards) {
    const mine = [...touches(c)];
    if (avoid.has(c.id) || mine.some((p) => taken.some((t) => overlap(p, t)))) { ser.push(c); continue; }
    taken.push(...mine); par.push(c);
  }
  return { par, ser };
}
