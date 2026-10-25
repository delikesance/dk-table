# Mode de calcul

Réglages du classeur (Paramètres, palette, F9) : automatique (défaut), manuel, itératif.

- **Manuel** : modifier une cellule ne calcule qu'elle ; ses dépendants attendent F9 (classeur) ou Maj+F9 / « Calculer la feuille » (feuille active). Indicateur « Manuel · F9 » dans la barre d'état.
- **Itératif** : les références circulaires d'une feuille sont recalculées jusqu'à un écart < `maxChange` (0,001) ou `maxIter` (100) itérations ; sinon les dernières valeurs restent. Hors itératif : `#CYCLE!`.
- **Persistance** : champ optionnel `calc` du `.dktable` (`{manual, iterative, maxIter, maxChange}`), absent si mode par défaut ; un fichier sans champ rouvre en automatique.

Code : `engine/calc-mode.ts` (état, abonnés), `engine/recalc.ts` (`solve`, `iterate`, `recalcOne`, `recalcSheet`), `engine/workbook.ts` (`recalcWorkbook`), `ui/appCalc.ts` (`recalc`, `calcField`, `loadCalc`), `io/calcFormat.ts` (`calcToDoc`, `checkCalc`), `ui/statusbar/calcBadge.ts`.

Limite : cycles inter-feuilles toujours `#CYCLE!`, même en itératif.
