# Rapport : Transformations rejouables (mini Power Query)
Statut : termine
Visible : oui

## Fait
- `src/engine/query.ts` : filtrer, scinder, dédoublonner, pivoter; `runQuery`, `tableOf`, `replayInto`.
- `src/engine/queryLua.ts` : conversion en macro Lua, pivot inclus (sans colonnes ni champ calculé).
- `src/ui/appLive.ts` : rejeu automatique à chaque modification de la source (hook `setTitle`), requêtes persistées.
- `src/ui/dialogs/query.ts` + palette « Transformations… » : étapes visibles, feuille « Requête » liée, macro Lua.
- Tests unitaires (dont `src/ui/appLive.test.ts`) + e2e (dont rejeu auto : modifier A2 de la source met à jour « Requête »), `docs/query.md`, TODO.md, CLAUDE.md.

## Non fait
- Pivot avec colonnes ou champ calculé non converti en Lua (commentaire généré).
- Liaison par noms de feuilles: renommer la source rompt le rejeu.

## Preuves
- Tests : ok (2240 tests)
- Captures : docs/screenshots/transformations-rejouables-mini-power-query/dialogue-clair.png, docs/screenshots/transformations-rejouables-mini-power-query/resultat-clair.png, docs/screenshots/transformations-rejouables-mini-power-query/dialogue-sombre.png, docs/screenshots/transformations-rejouables-mini-power-query/resultat-sombre.png

## Decisions
- Design `docs/design/2026-10-25-180012.html` lu: il traite validation de données/espion/plages tronquées, pas les transformations. Non applicable; UI alignée sur le dialogue Tableau croisé existant (jetons Hermes).
- Rejeu via `setTitle` (point unique de modification): pas de nouveau bus d'événements.
- Pivot Lua limité au cas sans colonnes/calcul; le reste reste dans le dialogue Tableau croisé.
- Macro Lua écrit le résultat 2 colonnes à droite de la plage source.
