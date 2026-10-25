# Texte en colonnes

Données > Texte en colonnes… : découpe la colonne sélectionnée (1re colonne de la plage) vers la droite.
- Délimiteurs : virgule, point-virgule, tabulation, espace, autre (texte libre), option « fusionner les consécutifs ».
- Guillemets doubles protègent un délimiteur (`"a,b",c`).
- Les cellules de droite sont écrasées ; un seul pas d'annulation (`app.editMany`).
- Code : `engine/textsplit.ts` (pur : `splitLine`, `splitColumn`), `ui/dialogs/textToCols.ts` (dialogue + `applyTextToColumns`), menu dans `ui/menubar/spec.ts`.
- Tests : `engine/textsplit.test.ts`, `ui/dialogs/textToCols.test.ts`, `e2e/feat-texte-colonnes.spec.ts`.
