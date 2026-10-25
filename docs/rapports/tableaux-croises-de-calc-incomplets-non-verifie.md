# Rapport : Tableau croisé dynamique
Statut : termine
Visible : oui

## Fait
- `src/engine/pivot.ts` + `pivotCalc.ts` : lignes, colonnes optionnelles, SUM/COUNT/AVG, champ calculé, totaux.
- `src/ui/dialogs/pivot.ts` : dialogue (palette « Tableau croisé… »), disposition par défaut, crée la feuille « Croisé ».
- Tests écrits d'abord : `pivot.test.ts`, `ui/dialogs/pivot.test.ts`; e2e `e2e/feat-pivot-diff.spec.ts`.

## Non fait
- Plusieurs champs de valeur, filtres, entrée dans la barre de menus, actualisation après édition des données.

## Preuves
- Tests : ok (1924 tests)
- Captures : docs/screenshots/tableaux-croises-de-calc-incomplets-non-verifie/dialogue-clair.png, dialogue-sombre.png, resultat-clair.png, resultat-sombre.png

## Decisions
- Défaut : 1re colonne non numérique en lignes, 1re numérique en valeur, SUM, sans colonnes.
- Champ calculé : noms de colonnes sans espace, + - * / et parenthèses; ligne invalide ignorée.
- Palette seulement (pas de menu) pour ne pas heurter les autres workers.
