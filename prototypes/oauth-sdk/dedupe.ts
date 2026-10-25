/**
 * Doublons deterministes entre cartes, avant tout appel modele.
 *
 * Quoi : `similarity(a, b)` = indice de Jaccard sur les mots significatifs (> 3 lettres, accents et casse ignores);
 *        `findDuplicates(cartes, connus)` renvoie id -> raison pour chaque carte trop proche d'une carte deja traitee
 *        (cartes terminees, taches faites de TODO.md, carte precedente du meme lot).
 * Pourquoi : une idee reformulee ne doit pas relancer un agent; le modele ne tranche que ce que le code ne sait pas.
 * Usage : `findDuplicates(lot, [{ title: "Audit de modele", where: "termines.jsonl" }])`.
 */

/** Carte minimale. */
export interface DupCard { id: string; title: string }
/** Titre deja traite et d'ou il vient (pour la raison). */
export interface Known { title: string; where: string }

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3));

/** Jaccard des mots significatifs (0 si l'un des titres n'en a aucun). */
export function similarity(a: string, b: string): number {
  const x = words(a), y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}

/** Titres des taches faites (`- [x]`) de TODO.md. */
export function doneTitles(todo: string): Known[] {
  return todo.split(/\r?\n/).flatMap((l) => {
    const m = /^\s*[-*]\s+\[[xX]\]\s+(.*)$/.exec(l);
    return m ? [{ title: m[1].replace(/\*\*/g, "").slice(0, 200), where: "TODO.md" }] : [];
  });
}

/** Cartes en doublon (id -> raison); la premiere carte d'un groupe reste, les suivantes sont ecartees. */
export function findDuplicates(cards: DupCard[], known: Known[], threshold = 0.7): Map<string, string> {
  const out = new Map<string, string>();
  const seen: Known[] = [...known];
  for (const c of cards) {
    const hit = seen.find((k) => similarity(c.title, k.title) >= threshold);
    if (hit) out.set(c.id, `doublon de « ${hit.title} » (${hit.where})`);
    else seen.push({ title: c.title, where: "meme lot" });
  }
  return out;
}
