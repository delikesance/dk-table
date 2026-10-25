# Toile de design de la Boucle

La page `/design.html` du serveur de la Boucle (`prototypes/oauth-sdk/`) est une **toile vierge** : un agent
y écrit une page HTML autonome (scripts et animations compris), l'humain la voit en direct.

## Fonctionnement

- Fichiers : `docs/design/<date>-<HHmmss>.html`, un par design, jamais écrasés. Lecture en couches
  (worktree du secteur en cours, arbre principal, ref `developpement`) par `designStore.ts`.
- Service : `GET /designs/<nom>` renvoie le fichier avec le runtime `designRuntime.ts` injecté et une CSP
  `sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:`
  (scripts permis, réseau coupé, cadre sans origine).
- Page : `design.html` + `design-view.css` + `design-view.js`. Barre : historique, largeurs (390/820/1200/1600/libre),
  zoom (ajusté, 100, 75, 50 %), thème (auto/clair/sombre), pause, relancer, comparer deux designs, panneau d'erreurs.
- Pilotage : `postMessage({dk:1, type:"theme"|"pause", value})` vers le design; le design (via le runtime)
  renvoie `ready` et `error`. Seules les erreurs de l'iframe affichée sont retenues.
- Économie : l'iframe n'est recréée que si le fichier (nom + date) change ou sur « Relancer »; les rafales
  d'événements sont regroupées (une lecture toutes les 2 s) et rien n'est lu onglet caché.

## Utilisation par un agent

Skill `.claude/skills/design-canvas/SKILL.md` + `starter.html`. Le secteur design de la Boucle le cite dans son prompt.
