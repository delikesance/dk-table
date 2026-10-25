# Rapport : Statistiques de sélection dans la barre d'état
Statut : termine
Visible : oui

## Fait
- `src/ui/statusbar/stats.ts` (pur : `selectionStats`, `statItems`), `statusbar.ts` (barre `.dk-status`), `statusbar.css`.
- Branché dans `app.ts` (entre grille et onglets) et `appGrid.ts` `syncInfo` (mise à jour à chaque sélection / édition).
- Moyenne, Nb, Nb numérique, Min, Max, Somme dès 2 cellules sélectionnées; sans nombre, seul Nb s'affiche.
- Tests d'abord : `statusbar/stats.test.ts`; e2e `e2e/feat-selstats.spec.ts`.

## Non fait
- Rien

## Preuves
- Tests : ok (2026 tests)
- Captures : docs/screenshots/statistiques-de-selection-dans-la-barre-d-etat/statistiques-clair.png, statistiques-sombre.png

## Decisions
- TODO coché à tort, fonctionnalité absente, donc implémentée.
- Nb = cellules non vides; seuls les vrais nombres alimentent Somme/Moyenne/Min/Max.
- Format fr-FR, 10 décimales max.
