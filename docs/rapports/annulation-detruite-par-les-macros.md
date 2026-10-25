# Rapport : Annulation détruite par les macros
Statut : termine
Visible : non

## Fait
- `src/ui/macros/run.ts` : `runAppMacro` exécute la macro dans `app.batch` = un seul pas d'annulation, historique conservé.
- `src/ui/model.ts` : plafond d'annulation 100 -> 1000 pas par feuille (`MAX_UNDO`).
- Tests : `src/ui/macros/macros.test.ts` (un pas; aucun pas si rien ne change), `src/ui/model.undo.test.ts` (plafond 1000).
- `docs/demo.md` mis à jour.

## Non fait
- Rien

## Preuves
- Rouge : `MAX_UNDO=100` + test 1000 -> `expected 100 to be 1000` (1 échec); vert avec 1000 (9 tests).
- Tests : ok (2102 tests)
- Captures : sans objet (aucun effet visible nouveau)

## Decisions
- Design `2026-10-25-162708.html` : pas de pile d'annulation globale, seulement « un pas d'annulation » pour la restauration d'historique; aucune contradiction avec 1000 pas.
- `pipeline.parallel.test.ts` : échec de durée, indépendant de ces changements (aucun fichier prototypes touché), échoue aussi en isolé; hors périmètre.
- `TODO.md` l.232 reste non cochée (autres sous-points non faits), mention « annulation après macro : fait » exacte.
- Pas de capture : comportement interne d'historique.
- Plafond 1000 plutôt qu'illimité : snapshots complets, mémoire bornée.
- Seul échec : `prototypes/oauth-sdk/pipeline.parallel.test.ts` (test de durée, sans lien).
