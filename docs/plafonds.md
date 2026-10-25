# Plafonds façon Google Sheets

Avertissement par toast (8 s), jamais de troncature silencieuse ni de données modifiées. Code : `ui/limits.ts`.
- Cellule > 50 000 caractères (`MAX_CELL_CHARS`) : prévenu à la saisie, au collage et à l'import ; texte conservé.
- Import CSV : > 200 000 cellules (`IMPORT_WARN_CELLS`) signalé ; toutes les lignes sont gardées (pas de troncature).
- Branché dans `appApi.ts` (`edit`, `editMany`, `importSheet`) et `appGrid.ts` (`onEdit`).
- Tests : `ui/limits.test.ts`, `e2e/feat-texte-colonnes.spec.ts` (toast cellule).

## Pas de plafond de lignes (classeur sans plafond)

- Plus de plafond : `MAX_ROWS` (1000) n'est plus qu'un plancher initial. La feuille garde un bloc de `ROW_STEP` (1000) lignes libres après sa dernière ligne utilisée ; elle grandit par blocs quand on écrit près de la fin (`engine/rows.ts`: `lastUsedRow`, `rowsNeeded`). `appGrid.ts` (`growRows` dans `touch`) reconstruit la grille seulement quand le nombre de lignes change ; la sélection et le défilement sont conservés.
- Aucun toast « ligne non affichée » : la grille virtualise toutes les lignes.
- Limite honnête : on ne peut écrire que jusqu'à la réserve (un bloc après la dernière ligne utilisée). Une navigation vers des lignes vides, sans écriture, reste bornée à cette réserve.

## Poids du classeur (limites visibles)

- `engine/weight.ts` (`sheetWeight`, `formatBytes`) : cellules non vides, caractères (≈ octets). Niveaux : léger (≤ 200 000 cellules), lourd (> `WEIGHT_WARN_CELLS`), très lourd (> 1 000 000 cellules ou > 10 M de caractères).
- `ui/statusbar/weightBadge.ts` : indicateur « N cellules · taille » à gauche de la barre d'état, toujours visible (`data-level`, infobulle sur l'effet attendu). Mis à jour par `touch` et `buildGrid` (pas à chaque sélection).
- Aucun blocage : seul l'affichage change selon le niveau.
- Tests : `engine/weight.test.ts`, `engine/rows.test.ts`, `ui/statusbar/weightBadge.test.ts`, `e2e/feat-classeur-poids.spec.ts` (captures `docs/screenshots/classeur-sans-plafond-avec-limites-visibles/`).
