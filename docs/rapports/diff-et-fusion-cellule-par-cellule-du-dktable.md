# Rapport : Diff et fusion cellule par cellule du .dktable
Statut : termine
Visible : oui

## Fait
- `src/io/diff.ts` : `diffCells`, `merge3` (conflit seulement si les deux côtés changent la même cellule), `diffDocs`.
- `src/ui/dialogs/diff.ts` : dialogue « Comparer avec un fichier… » (palette), lecture seule.
- Tests d'abord : `io/diff.test.ts`, `ui/dialogs/diff.test.ts`; e2e `e2e/feat-pivot-diff.spec.ts`.

## Non fait
- UI de fusion 3 voies (module prêt), fusion des feuilles ajoutées/supprimées, styles/largeurs non comparés.

## Preuves
- Tests : ok (1924 tests)
- Captures : docs/screenshots/diff-et-fusion-cellule-par-cellule-du-dktable/comparaison-clair.png, comparaison-sombre.png

## Decisions
- Feuilles appariées par id, à défaut par nom.
- En conflit, `merged` garde nos valeurs et le conflit est listé.
