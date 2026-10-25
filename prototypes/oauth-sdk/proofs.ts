/**
 * Lecture de la ligne « Captures » d'un rapport (section Preuves).
 *
 * Quoi : `parseCaptures(texte)` -> `{ paths, exempt }`: liste separee par virgules ou points-virgules (hors accolades et
 *        parentheses), accolades developpees (`{a,b}-{clair,sombre}.png`), notes entre parentheses ignorees,
 *        « sans objet » = exemption explicite (carte sans effet visible). Texte libre sans chemin = ignore.
 *        Element « `chemin` : legende » : seul le premier mot (le chemin) est garde.
 * Pourquoi : l'ancien parseur coupait sur toute virgule et gardait les notes comme chemins, bloquant des cartes finies.
 * Usage : `parseCaptures("docs/s/{a,b}.png (note)")` -> `{ paths: ["docs/s/a.png", "docs/s/b.png"], exempt: false }`.
 */

/** Developpe les groupes `{x,y}` (produit cartesien, de gauche a droite). */
export function expandBraces(s: string): string[] {
  const m = /\{([^{}]*)\}/.exec(s);
  if (!m) return [s];
  return m[1].split(",").flatMap((alt) => expandBraces(s.slice(0, m.index) + alt.trim() + s.slice(m.index + m[0].length)));
}

/** Coupe sur `,` et `;` hors accolades. */
function split(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "{") depth++;
    if (ch === "}") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  return [...out, cur];
}

/** Chemins de captures annonces + exemption « sans objet ». */
export function parseCaptures(text: string): { paths: string[]; exempt: boolean } {
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/\bsans objet\b/.test(plain)) return { paths: [], exempt: true };
  const noNotes = text.replace(/\([^()]*\)/g, " ").replace(/\{[^{}]*\}/g, (m) => m.replace(/\s+/g, ""));
  // Premier mot de chaque element: `chemin : legende` garde le chemin; texte libre (1er mot sans chemin) ignore.
  const paths = split(noNotes).map((t) => t.replace(/[`'"]/g, "").trim().split(/\s+/)[0]).filter((t) => /[/\\]|\.png\b/i.test(t))
    .flatMap(expandBraces);
  return { paths: [...new Set(paths)], exempt: false };
}
