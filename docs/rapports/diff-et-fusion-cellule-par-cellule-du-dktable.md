# Rapport : Diff et fusion cellule par cellule du .dktable
Statut : termine
Visible : oui

## Fait
- Déjà livré : `io/diff.ts` (`diffCells`, `merge3`, `diffDocs`), dialogue « Comparer avec un fichier… ».
- `io/mergeDocs.ts` (`mergeDocs` par feuille), `ui/dialogs/merge.ts` (« Fusionner… », aperçu lecture seule base/nôtre/leur/résultat, conflits en évidence), menu Données + palette `file.merge`.
- Tests d'abord : `io/mergeDocs.test.ts`, `ui/dialogs/merge.test.ts`; e2e `e2e/feat-diff-merge.spec.ts`.

## Non fait
- Résolution conflit par conflit et application du résultat au classeur.

## Preuves
- Tests : ok (2107 passés, 1 échec pré-existant hors carte : pipeline.parallel.test.ts:62, timing)
- Captures : docs/screenshots/diff-et-fusion-cellule-par-cellule-du-dktable/merge-apercu-clair.png, docs/screenshots/diff-et-fusion-cellule-par-cellule-du-dktable/merge-apercu-sombre.png

## Decisions
- Fusionner… : classeur ouvert = « nôtre », l'utilisateur choisit la base et « leur » version (.dktable); aperçu lecture seule.
- Feuilles appariées par id, à défaut par nom; en conflit, l'aperçu garde nos valeurs.
