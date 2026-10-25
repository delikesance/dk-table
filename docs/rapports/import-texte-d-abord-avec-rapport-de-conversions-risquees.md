# Rapport : Import texte d'abord avec rapport de conversions risquées
Statut : termine
Visible : oui

## Fait
- `src/io/csvText.ts` : détection des valeurs risquées, import texte d'abord, rapport par colonne.
- `src/ui/dialogs/importReport.ts` : dialogue, case « Convertir » par colonne, câblé dans `importCsv`.
- Hook dev `window.__dkImportCsv` (`src/main.ts`) + e2e `e2e/feat-import-texte.spec.ts`.
- Doc `docs/import-texte.md`, TODO.md coché.

## Non fait
- Rien.

## Preuves
- Tests : ok (2122 tests)
- Captures : docs/screenshots/import-texte-d-abord-avec-rapport-de-conversions-risquees/rapport-clair.png, docs/screenshots/import-texte-d-abord-avec-rapport-de-conversions-risquees/rapport-sombre.png, docs/screenshots/import-texte-d-abord-avec-rapport-de-conversions-risquees/resultat-clair.png, docs/screenshots/import-texte-d-abord-avec-rapport-de-conversions-risquees/resultat-sombre.png

## Decisions
- Logique et dialogue déjà présents dans le worktree (tests verts avant); ajouté e2e, captures, doc, TODO.
- Hook de test en `import.meta.env.DEV` faute de dialogue Tauri en e2e.
- Code préexistant (csvText.ts, importReport.ts): test rouge non observé, TDD non respecté sur cette partie
