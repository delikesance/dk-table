# Import CSV « texte d'abord »

- Quoi : à l'import CSV, les valeurs risquées restent du texte (apostrophe de forçage) : zéros de tête (`007`), `SEPT2`/`Dec-1`, IBAN, 16 chiffres et plus, `1E5`, `1/2`.
- Pourquoi : l'auto-détection les convertirait à tort (date, nombre arrondi, zéros perdus).
- Code : `src/io/csvText.ts` (`riskOf`, `importTextFirst(texte, { refuse })` -> `{ sheet, columns }`), dialogue `src/ui/dialogs/importReport.ts` (`openImportReport`), branché dans `ui/fileops.ts` `importCsv`.
- Usage : Fichier > Importer CSV. Sans valeur risquée : import direct. Sinon rapport par colonne (motif, exemples); cocher « Convertir » accepte la conversion de la colonne, puis « Importer ».
- Tests : `src/io/csvText.test.ts`, `src/ui/dialogs/importReport.test.ts`, e2e `e2e/feat-import-texte.spec.ts` (hook dev `window.__dkImportCsv(nom, texte)` dans `main.ts`, absent du build).
