# Rapport : Modèle de niveaux d'outline (8 niveaux) et état plié/déplié pour lignes et colonnes
Visible : non

## Fait
- `MAX_LEVEL` passe de 3 à 8 (`src/engine/outline.ts`) : niveaux 0 à 8, hors bornes ou non entier = `RangeError`.
- `src/engine/outlineState.ts` : `SheetOutline { rows, cols }`, état plié/déplié séparé par axe. Setters, collapse/expand, `showRowLevel`/`showColLevel` (plier un niveau masque les lignes/colonnes plus profondes contiguës), `hiddenRows`/`hiddenCols`.
- `src/engine/outlineFormat.ts` : `outlineToJson` / `outlineFromJson(raw, rows, cols)`, validation complète (niveaux, longueur de l'axe, index et profondeur des replis), `RangeError` sur entrée invalide.
- Tests : `src/engine/outlineState.test.ts` (écrit rouge d'abord), `src/engine/outline.test.ts` mis à jour (bornes 0-8).

## Non fait

## Captures

## Decisions
- Chemins : `src/model/` n'existe pas dans ce dépôt ; le modèle d'outline vit dans `src/engine/`, on reste dedans.
- Le modèle par axe réutilise `outline.ts` (même logique pour lignes et colonnes) ; `outlineState.ts` ne fait que les regrouper.
- Hors carte : câblage dans le format `.dktable` (`DocSheet`) et rendu de la grille (masquage, boutons +/-) : cartes séparées.
