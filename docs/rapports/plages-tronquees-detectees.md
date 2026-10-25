# Rapport : Plages tronquees detectees
Statut : bloque
Visible : oui

## Fait
- Detection `range` de l'audit : ligne non vide juste sous une plage (ex. `=SUM(A1:A3)` avec une valeur en A4).
- Code : `src/engine/model/audit.ts` (`missedRow`, `auditModel`), tests `src/engine/model/audit.test.ts`.
- UI : `src/ui/dialogs/audit.ts` (liste d'alertes, clic = aller a la cellule).
- E2E : `e2e/feat-audit.spec.ts`, `e2e/rapport-plages-tronquees.spec.ts` (captures).

## Non fait
- Correction en un clic
- Detection nombres stockes en texte (SUM ignore le texte)

## Preuves
- Tests : ok (2240 tests)
- Captures : docs/screenshots/plages-tronquees-detectees/alerte-clair.png, docs/screenshots/plages-tronquees-detectees/alerte-sombre.png

## Decisions
- Trancheur: rapport seul, pas de code; statut bloque car manques ci-dessus.
- TODO.md:229 annote "(partiel: correction 1-clic + nombres-en-texte)".
