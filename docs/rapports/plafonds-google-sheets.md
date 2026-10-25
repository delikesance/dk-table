# Rapport : Plafonds Google Sheets
Statut : termine
Visible : oui

## Fait
- `src/ui/limits.ts` (checkCells, checkImport) branché sur edit/editMany/importSheet/onEdit grille

## Non fait
- Rien

## Preuves
- Tests : ok (2102 tests; 1 échec hors périmètre: prototypes pipeline.parallel timing)
- Captures : docs/screenshots/plafonds-google-sheets/toast-cellule-{clair,sombre}.png (import CSV non capturé : dialogue Tauri absent en e2e, couvert en unitaire)

## Decisions
- Avertir sans tronquer : le texte est conservé
- Import volumineux = plus de 200 000 cellules
