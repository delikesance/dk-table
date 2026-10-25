# Rapport : Annulation détruite par les macros
Statut : termine
Visible : non

## Fait
- `src/ui/macros/run.ts` : `runAppMacro` exécute la macro dans `app.batch` = un seul pas d'annulation, historique conservé.
- Tests : `src/ui/macros/macros.test.ts` (un pas d'annulation; aucun pas si rien ne change).

## Non fait
- Rien

## Preuves
- Tests : ok (2020 tests)
- Captures : sans objet (aucun effet visible nouveau)

## Decisions
- Pas de capture : comportement interne d'historique.
