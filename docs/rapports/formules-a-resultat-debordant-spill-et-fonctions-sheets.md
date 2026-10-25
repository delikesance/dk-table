# Rapport : Formules à résultat débordant (spill) et fonctions Sheets
Statut : termine
Visible : oui

## Fait
- Moteur : débordement minimal (`engine/spill.ts`, `fn-spill.ts`), SPLIT, UNIQUE, FILTER (condition sur plage), SORT.
- `#SPILL!` si zone bloquée (saisie, bord de feuille); libération au recalcul/effacement.
- Docs : `docs/spill.md`, fndocs FR.

## Non fait
- Références `A1#`, spill imbriqué dans une expression (première valeur seulement), SEQUENCE etc.

## Preuves
- Tests : ok (1923 tests, dont 10 dans `engine/spill.test.ts`; `tsc --noEmit` ok)
- Captures : docs/screenshots/formules-a-resultat-debordant-spill-et-fonctions-sheets/spill-clair.png, docs/screenshots/formules-a-resultat-debordant-spill-et-fonctions-sheets/spill-sombre.png

## Decisions
- Spill limité aux formules dont la fonction de tête est SPLIT/UNIQUE/FILTER/SORT (pas de type matrice dans `Value`).
- Dépendants des cellules déversées recalculés via `recalc(k, valeur)` imbriqué.
