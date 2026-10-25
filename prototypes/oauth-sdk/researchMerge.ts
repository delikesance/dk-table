/**
 * Doublons et cache de la recherche : une idee n'est gardee qu'une fois, les anciennes idees ne sont jamais perdues.
 *
 * Quoi : `nameOf(puce)` = nom normalise (gras, sans accents); `dedupe` retire les doublons entre axes et les idees deja connues;
 *        `namesOf(doc)` = noms de la synthese existante; `mergeDoc(doc, items, axes)` ajoute les nouvelles idees a l'ancienne synthese.
 * Pourquoi : les 4 axes se chevauchent (meme idee trouvee deux fois) et chaque run reecrivait la synthese sans les idees precedentes.
 * Usage : `mergeDoc(lireSynthese(), dedupe(items, ordre, namesOf(doc)), AXES)`.
 */

/** Nom normalise d'une puce : texte en gras, sinon debut du texte; minuscules, sans accents ni ponctuation. */
export function nameOf(item: string): string {
  const raw = /\*\*(.+?)\*\*/.exec(item)?.[1] ?? item.replace(/^\s*[-*]\s*/, "").slice(0, 60);
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Retire les doublons (entre axes, dans un axe) et les idees `known`; l'axe qui vient en premier garde l'idee. */
export function dedupe(items: Record<string, string[]>, order: string[], known: ReadonlySet<string>): Record<string, string[]> {
  const seen = new Set(known);
  const out: Record<string, string[]> = {};
  for (const id of order) {
    out[id] = [];
    for (const it of items[id] ?? []) {
      const n = nameOf(it);
      if (!n || seen.has(n)) continue;
      seen.add(n); out[id].push(it);
    }
  }
  return out;
}

/** Puces par titre de section `## ` d'une synthese. */
function sections(md: string | null): Map<string, string[]> {
  const m = new Map<string, string[]>();
  let cur: string[] | null = null;
  for (const l of (md ?? "").split(/\r?\n/)) {
    const h = /^## (.+?)\s*$/.exec(l);
    if (h) { cur = []; m.set(h[1], cur); } else if (cur && /^\s*[-*] /.test(l)) cur.push(l.replace(/^\s*[*-] /, "- ").trimEnd());
  }
  return m;
}

/** Noms de toutes les idees d'une synthese (ensemble vide si absente). */
export function namesOf(md: string | null): Set<string> {
  return new Set([...sections(md).values()].flat().map(nameOf));
}

/** Synthese = anciennes idees puis nouvelles, par axe, sans doublon. */
export function mergeDoc(old: string | null, items: Record<string, string[]>, axes: { id: string; title: string }[]): string {
  const prev = sections(old);
  const merged = dedupe(Object.fromEntries(axes.map((a) => [a.id, [...(prev.get(a.title) ?? []), ...(items[a.id] ?? [])]])), axes.map((a) => a.id), new Set());
  return "# Recherche de fonctionnalites\n\n" + axes.map((a) => `## ${a.title}\n\n${merged[a.id].join("\n")}\n`).join("\n");
}
