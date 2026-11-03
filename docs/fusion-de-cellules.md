# Fusion de cellules

- **Fusionner** : sélectionner une plage, puis barre d'outils (bouton fusion), menu Format > « Fusionner les cellules », clic droit ou palette. La cellule en haut à gauche (l'ancre) absorbe la plage ; les valeurs et styles des autres cellules sont supprimés (un toast indique combien, Ctrl+Z annule).
- **Annuler la fusion** : même bouton sur une cellule fusionnée, ou « Annuler la fusion » (menu, clic droit, palette).
- Une fusion qui en chevauche une autre la remplace. Maximum 10 000 cellules par fusion.
- Le curseur se place sur l'ancre ; les flèches sortent de la fusion dans le sens du déplacement.
- Les fusions suivent l'insertion/suppression de lignes et colonnes (`shiftMerges`), sont annulables et enregistrées dans `.dktable` (`sheets[].merges`, ex. `["B2:D3"]`).
- Limites : une fusion dont l'ancre est hors de la zone affichée (défilement) n'est pas dessinée ; les filtres et lignes masquées à l'intérieur d'une fusion ne sont pas gérés ; les exports CSV et Markdown (tableaux à pipes) ne savent pas fusionner : la valeur de l'ancre reste, les autres cellules sont vides.
- Documents : les blocs tableau liés (rendu dans le document, export HTML/impression) reprennent les fusions de la plage en `colspan`/`rowspan` (`tableCells`, `doc/blocks.ts`) ; une fusion ne traverse pas l'en-tête, et avec un choix de colonnes seules les colonnes affichées comptent.
- Code : `src/ui/grid/merges.ts` (logique pure), `src/ui/appMerge.ts` (API), rendu dans `src/ui/grid/grid.ts`. Tests : `merges.test.ts`, `appMerge.test.ts`, `doc/export.test.ts`, e2e `e2e/feat-merge.spec.ts`.
