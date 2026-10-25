/**
 * Assets servis par la boucle (seuls fichiers lisibles hors pages) : route -> [fichier relatif au dossier du code, type].
 * Le theme est celui de l'application : `src/styles/tokens.css` (clair) et `theme-dark.css` (nuit) servis tels quels.
 */
export const ASSETS: Record<string, [string, string]> = {
  "GET /panel.css": ["panel.css", "text/css; charset=utf-8"],
  "GET /fonts.css": ["fonts.css", "text/css; charset=utf-8"],
  "GET /theme.js": ["theme.js", "text/javascript; charset=utf-8"],
  "GET /theme/tokens.css": ["../../src/styles/tokens.css", "text/css; charset=utf-8"],
  "GET /theme/theme-dark.css": ["../../src/styles/theme-dark.css", "text/css; charset=utf-8"],
  "GET /panel.js": ["panel.js", "text/javascript; charset=utf-8"],
  "GET /moodboard-view.css": ["moodboard-view.css", "text/css; charset=utf-8"],
  "GET /moodboard-view.js": ["moodboard-view.js", "text/javascript; charset=utf-8"],
  "GET /design-view.css": ["design-view.css", "text/css; charset=utf-8"],
  "GET /design-view.js": ["design-view.js", "text/javascript; charset=utf-8"],
};
