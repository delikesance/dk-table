# Plafonds façon Google Sheets

Avertissement par toast (8 s), jamais de troncature silencieuse ni de données modifiées. Code : `ui/limits.ts`.
- Cellule > 50 000 caractères (`MAX_CELL_CHARS`) : prévenu à la saisie, au collage et à l'import ; texte conservé.
- Ligne > `MAX_ROWS` (1000, `grid/virtual.ts`) : écriture hors grille signalée (`checkCells`).
- Import CSV : plus de `MAX_ROWS` lignes (seules les premières sont affichées), > 200 000 cellules (`IMPORT_WARN_CELLS`), cellule trop longue (`checkImport`).
- Branché dans `appApi.ts` (`edit`, `editMany`, `importSheet`) et `appGrid.ts` (`onEdit`).
- Tests : `ui/limits.test.ts`, `e2e/feat-texte-colonnes.spec.ts` (toast cellule).
