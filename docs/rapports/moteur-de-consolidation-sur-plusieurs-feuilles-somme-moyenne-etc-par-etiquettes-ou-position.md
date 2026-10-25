# Rapport : Moteur de consolidation sur plusieurs feuilles (somme, moyenne, etc. par étiquettes ou position)
Statut : termine
Visible : non

Moteur pur (`src/engine/consolidate.ts`), sans branchement UI. L'entrée visible (Données > Consolider) relève de la carte « Boîte de dialogue Données > Consolider ».

## Fait

- Test d'abord : `src/engine/consolidate.test.ts` (rouge avant implémentation).
- `consolidate(sources, { fn, topRow, leftCol })` : agrège des grilles de texte par position ou par étiquettes (ligne du haut, colonne de gauche).
- Fonctions SUM, COUNT, AVERAGE, MIN, MAX via `engine/aggregate.ts`.
- Texte et vides ignorés sans erreur ; étiquettes identiques fusionnées, nouvelles étiquettes ajoutées dans l'ordre de première apparition.

## Non fait

## Captures

Aucune (moteur sans effet visible).

## Decisions
- Hors carte : Branchement UI (dialogue, menu Données, palette) : carte « Boîte de dialogue Données > Consolider ».
- Hors carte : Lecture des plages depuis le classeur (`Book`) : le moteur reçoit des grilles déjà extraites.

- Pas de branchement UI dans cette carte : le moteur est pur et testable seul ; la boîte de dialogue reste à faire.
- Une cellule sans nombre contributeur renvoie `""` (pas `0`), pour distinguer « vide » de « zéro ».
- Étiquette vide sur l'axe étiqueté : la ligne/colonne est ignorée (pas de clé de fusion possible).
- Documentation : `docs/consolidation.md`.

## Preuves
- Tests : ok (8 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"count":8,"scope":"related"},"tsc":{"ok":true}} -->
