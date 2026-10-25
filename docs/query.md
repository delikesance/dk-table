# Transformations rejouables (mini Power Query)

- `engine/query.ts` (pur) : `Step` (filter, split, dedupe, pivot), `runQuery`, `stepLabel`, `tableOf`, `replayInto(dst, table, steps)`.
- `engine/queryLua.ts` : `queryToLua(steps, range)`, macro Lua équivalente (filtre, scinde, dédoublonne, pivot sans colonnes/champ calculé).
- `ui/appLive.ts` : requêtes vivantes (source -> feuille résultat, persistées `dk-table.livequery`), rejouées par `setTitle` à chaque modification du classeur.
- Dialogue `ui/dialogs/query.ts` (palette « Transformations… ») : ajoute des étapes (mémorisées `dk-table.query`); « Appliquer » crée la feuille « Requête » liée à la source; « Macro Lua » crée la macro.
- Limites : liaison par noms de feuilles (renommer la source la rompt); modifier la feuille résultat est écrasé au rejeu; pivot avec colonnes/champ calculé non converti en Lua; tri des clés du pivot Lua = numérique sinon ASCII.
- Tests : `engine/query.test.ts`, `engine/queryLua.test.ts` (macro exécutée), `ui/appLive.test.ts`, e2e `e2e/feat-query.spec.ts` (captures + rejeu auto).
