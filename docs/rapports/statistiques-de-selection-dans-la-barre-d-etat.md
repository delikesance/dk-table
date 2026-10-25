# Rapport : Statistiques de sélection dans la barre d'état
Statut : termine
Visible : oui

## Fait
- `src/ui/statusbar/stats.ts` (pur : `selectionStats`, `statItems`), `statusbar.ts` (barre `.dk-status`), `statusbar.css`.
- Branché dans `app.ts` (entre grille et onglets) et `appGrid.ts` `syncInfo` (mise à jour à chaque sélection / édition).
- Moyenne, Nb, Nb numérique, Min, Max, Somme dès 2 cellules sélectionnées; sans nombre, seul Nb s'affiche.
- Menu « Stats ▾ » (cases à cocher) choisit les entrées affichées; choix persisté (`dk-table.statusbar`, localStorage).
- Clic droit sur la barre ouvre aussi le menu des entrées (test d'abord).
- Tests d'abord : `statusbar/stats.test.ts`; e2e `e2e/feat-selstats.spec.ts`.

## Non fait
- Rien

## Preuves
- Tests : ok (2246 tests; tsc ok; e2e feat-selstats ok)
- Captures : docs/screenshots/statistiques-de-selection-dans-la-barre-d-etat/selection-clair.png, docs/screenshots/statistiques-de-selection-dans-la-barre-d-etat/selection-sombre.png

## Decisions
- TODO coché à tort, fonctionnalité absente, donc implémentée.
- Nb = cellules non vides; seuls les vrais nombres alimentent Somme/Moyenne/Min/Max.
- Format fr-FR, 10 décimales max.
- Entrées au choix par menu absentes, ajoutées en TDD (`statItems(..., enabled)`, menu dans `statusbar.ts`); par défaut les 6 cochées. Décision prise sans trancheur.
