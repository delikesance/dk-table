# Décimal exact (mode comptable)

Option par classeur : Fichier > Paramètres (Ctrl+,) > « Décimal exact (mode comptable) ».

- Quoi : après chaque `+ - * / ^` et `%`, le résultat est arrondi à 15 chiffres significatifs (précision d'Excel) : `=0.1+0.2` vaut 0,3 (pas 0,30000000000000004).
- Pourquoi : pas de lib décimale; ce arrondi suffit aux montants comptables et reste léger.
- Écart « affiché ≠ stocké » : en mode actif, une cellule dont le format (Nombre, Devise, Comptabilité : 2 décimales; Pourcentage : 2 décimales du %) arrondit la valeur reçoit un coin orange (`dkg-gap`) et une infobulle « Affiché ≠ stocké : <valeur> ».
- Persistance : champ optionnel `decimal: true` du `.dktable` (absent = IEEE 754, rétrocompatible).
- Code : `src/engine/decimal.ts` (`setDecimalMode`, `fix`, `displayGap`, `onDecimalChange`), `evaluator.ts` (`fix`), `ui/appApi.ts` (recalcul au changement, `toDoc/loadDoc`), `ui/dialogs/settings.ts`, `ui/grid/cellkind.ts` + `grid.css`.
- Limite : les fonctions (SUM, etc.) ne sont pas arrondies; l'état est global (un classeur ouvert à la fois).
- Tests : `src/engine/decimal.test.ts`, `src/io/format.test.ts`, e2e `e2e/feat-decimal.spec.ts`.
