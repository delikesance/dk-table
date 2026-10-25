# Rapport : Plages tronquees detectees
Statut : termine
Visible : oui

## Fait
- Detection `range` de l'audit : ligne non vide juste sous une plage (ex. `=SUM(A1:A3)` avec une valeur en A4).
- Detection nombres stockes en texte (`'20`) dans une plage (ignores par SUM/AVERAGE).
- Correction en un clic : `Finding.fix` (`label`, `edits`), bouton dans le panneau d'audit (etendre la plage ou convertir en nombres), audit relance apres correction.
- Code : `src/engine/model/audit.ts` (`missedRow`, `textNumbers`, `Fix`), `src/ui/dialogs/audit.ts` (bouton `.dk-audit__fix`), tests `src/engine/model/audit.test.ts`.
- E2E : `e2e/feat-audit.spec.ts`, `e2e/rapport-plages-tronquees.spec.ts` (alerte puis correction, clair + sombre).

## Non fait

## Preuves
- Tests : ok (2248 tests)
- Captures : docs/screenshots/plages-tronquees-detectees/alerte-clair.png, docs/screenshots/plages-tronquees-detectees/alerte-sombre.png, docs/screenshots/plages-tronquees-detectees/corrige-clair.png, docs/screenshots/plages-tronquees-detectees/corrige-sombre.png

## Decisions
- Une seule extension d'une ligne par correction; l'audit relance propose la suivante si besoin.
- Nombres-en-texte = prefixe `'` + nombre; correction = reecrire la valeur sans `'`.
