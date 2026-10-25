/**
 * Garde de fusion: relie un test rouge aux fichiers modifies par la carte.
 *
 * Quoi : `stem(chemin)` nom sans extension ni `.test`; `isRelated(test, modifies)`; `relatedFailures(echecs, modifies)`.
 * Pourquoi : un test deja rouge sur la base n'est toleree que s'il n'a aucun lien avec ce que la carte a change;
 *        sinon la carte peut cacher une regression (voir git.ts `checks`).
 * Usage : `relatedFailures(["src/a.test.ts > x"], ["src/a.ts"])` -> `["src/a.test.ts > x"]`.
 */
import { basename } from "node:path/posix";

/** Nom du fichier sans extension finale ni suffixe `.test`/`.spec`. */
export const stem = (p: string): string => {
  const b = basename(p.replace(/\\/g, "/"));
  return /\.(?:test|spec)\.[a-z]+$/i.test(b) ? b.replace(/\.(?:test|spec)\.[a-z]+$/i, "") : b.replace(/\.[a-z]+$/i, "");
};

/** Vrai si le test est modifie, ou si un fichier modifie porte son nom (ou le debut de son nom). */
export function isRelated(testPath: string, changed: string[]): boolean {
  const t = stem(testPath);
  return changed.some((c) => {
    if (c.replace(/\\/g, "/") === testPath.replace(/\\/g, "/")) return true;
    const s = stem(c);
    return s === t || t.startsWith(s + ".") || s.startsWith(t + ".");
  });
}

/** Echecs (`fichier > describe > test`) lies aux fichiers modifies. */
export const relatedFailures = (fails: string[], changed: string[]): string[] =>
  fails.filter((f) => isRelated(f.split(" > ")[0], changed));
