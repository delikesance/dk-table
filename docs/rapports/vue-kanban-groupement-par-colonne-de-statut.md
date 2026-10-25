# Rapport : Vue Kanban (groupement par colonne de statut)
Statut : termine
Visible : oui

## Fait
- `src/engine/kanban.ts` (`groupByStatus`, `moveCard`, « Sans statut ») et boîte `src/ui/dialogs/kanban.ts` : colonnes par valeur du statut (colonne au choix), glisser ou liste pour déplacer = écrit le statut (annulable), lignes sans statut en « Sans statut », filtres de la grille appliqués (`App.rowHidden`).
- Palette « Vue Kanban… ». Styles `views.css`.
- Tests écrits d'abord : `src/engine/kanban.test.ts` (5), `src/ui/dialogs/kanban.test.ts` (4), e2e `e2e/feat-vues.spec.ts`. Doc : `docs/vues-galerie-kanban.md`.

## Non fait

## Captures
- docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-initial-clair.png
- docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-initial-sombre.png
- docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-deplace-clair.png
- docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-deplace-sombre.png

## Decisions
- Fichiers `.tsx` de la carte inexistants : TS/DOM, boîte modale.
- Vue non persistée; la boîte ne suit pas les changements de grille pendant qu'elle est ouverte.

## Preuves
- Tests : ok (369 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-initial-clair.png, docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-initial-sombre.png, docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-deplace-clair.png, docs/screenshots/vue-kanban-groupement-par-colonne-de-statut/kanban-deplace-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"count":369,"scope":"related"},"tsc":{"ok":true}} -->
