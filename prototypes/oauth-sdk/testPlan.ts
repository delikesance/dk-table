/**
 * Choix de la verification d'une carte d'apres les fichiers qu'elle modifie.
 *
 * Quoi : `planTests(changed)` -> `{ mode: "none" }` (documentation seule: ni tests ni tsc), `{ mode: "related", files }`
 *        (`vitest related`: seulement les tests qui importent ces fichiers, plus les tests modifies eux-memes) ou
 *        `{ mode: "full", why }` (repli : suite complete). La suite complete reste obligatoire une fois par lot avant tout push.
 * Pourquoi : chaque carte relancait `npm test` entier (~90 s ici) et la suite apres chaque synchronisation : premier goulot de la boucle.
 * Repli complet dans le doute : aucun fichier lisible, configuration touchee (package.json, tsconfig, vite/vitest, setup de tests, CI),
 *        dossier non couvert par vitest (src-tauri), ligne de commande trop longue (Windows ~8000 caracteres).
 * Usage : `planTests(["src/a.ts", "src/a.test.ts"])` -> `{ mode: "related", files: [...] }`.
 */
export type TestPlan = { mode: "none" } | { mode: "full"; why: string } | { mode: "related"; files: string[] };

/** Longueur maximale (caracteres) des chemins passes a `vitest related`. */
export const MAX_ARGS_CHARS = 7000;

const DOC = /^(docs\/|TODO\.md$|CLAUDE\.md$|README\.md$|LICENSE|\.gitignore$|\.boucle\/)|\.(md|png|jpe?g|gif|webp|woff2?|ico|icns)$/i;
const CONFIG = /^(package(-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+|vitest\.config\.[^/]+|src\/test-setup\.[^/]+|\.github\/.*|Dockerfile|docker-compose\.[^/]+|\.gitattributes|playwright\.config\.[^/]+)$/;

/** Plan de verification pour une liste de chemins (relatifs a la racine, `/` ou `\`). */
export function planTests(changed: string[]): TestPlan {
  const files = [...new Set(changed.map((p) => p.trim().replace(/\\/g, "/")).filter(Boolean))];
  if (!files.length) return { mode: "full", why: "aucun fichier modifie lisible" };
  const config = files.find((f) => CONFIG.test(f));
  if (config) return { mode: "full", why: `configuration modifiee (${config})` };
  const code = files.filter((f) => !DOC.test(f));
  if (!code.length) return { mode: "none" };
  const native = code.find((f) => f.startsWith("src-tauri/"));
  if (native) return { mode: "full", why: `hors vitest (${native})` };
  if (code.join(" ").length > MAX_ARGS_CHARS) return { mode: "full", why: "trop de fichiers pour une ligne de commande" };
  return { mode: "related", files: code };
}
