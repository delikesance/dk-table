# Rapport : Listes personnalisées de tri et de recopie
Visible : non

## Fait
- `src/engine/custom-lists.ts`: `validateList` (refuse vide, moins de 2 éléments, doublon à casse près, liste identique à une existante), `parseListText` (saisie par ligne, virgule ou point-virgule).
- `src/io/customLists.ts`: `createCustomLists(store)` persiste dans localStorage (`dk-table.customLists`), store injectable comme `io/recents.ts`; instance `customLists` pour l'app. Données corrompues = liste vide.
- `src/engine/series-names.ts`: `nameSeries(src, dir, extra)` teste les listes utilisateur avant les intégrées; recopie cyclique; insensible à la casse; casse de la source appliquée.
- `src/engine/series.ts`: `extendSeries(..., lists)`; `src/ui/grid/seriesFill.ts` passe `customLists.lists()` (poignée de recopie).
- `src/engine/sort.ts`: option `list` (les valeurs de la liste passent avant les autres, dans l'ordre de la liste; vides en bas; `desc` inverse dans la liste).
- Tests: `src/engine/custom-lists.test.ts`, `src/engine/series-custom.test.ts`, `src/engine/sort-custom.test.ts`, `src/io/customLists.test.ts`. Tests liés (series, sort, ui/grid): 35 fichiers, 289 tests verts; `tsc --noEmit` sans erreur.

## Non fait
- Interface de saisie/édition des listes (paramètres ou dialogue): sans elle, l'utilisateur ne peut pas créer de liste dans l'app. Le `parseListText` est prêt pour ce dialogue.
- `ui/sort.ts` ne transmet pas encore `list` (le tri n'est pas câblé dans l'UI).
- Suppression d'une liste: non prévue dans l'API.

## Captures
Aucune: `Visible : non` (pas d'interface pour créer une liste).

## Decisions
- Design `docs/design/2026-10-25-200330.html` ignoré: il traite de l'analyse what-if, pas des listes (avis du sous-agent `trancheur`, confirmé).
- Modules purs `engine/custom-lists.ts` + persistance `io/customLists.ts`, calqués sur `io/recents.ts`.
- Recopie: les listes utilisateur sont testées avant les listes intégrées (mois/jours); cohérent avec la priorité déjà donnée aux jours pour « mar ».
- Tri: éléments de la liste d'abord (ordre de la liste), les autres ensuite triés normalement; en `desc`, l'ordre de la liste est inversé, les autres restent après.
- Saisie: séparateurs retour à la ligne, virgule, point-virgule.
- Doublon refusé à casse près et au niveau de la séquence (même liste dans un autre ordre = liste différente, acceptée).
