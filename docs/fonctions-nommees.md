# Fonctions nommées

- Données > Fonctions nommées… : nom, paramètres (lettres seules, séparés par `;`), corps (formule, `=` facultatif). Ex. `TVA(ht; taux)` = `=ht*(1+taux)`, appel `=TVA(A1;0,2)`.
- Code : `engine/userfnStore.ts` (registre, `checkUserFn`, `expandUserCall` : paramètres remplacés par l'AST des arguments), `engine/userfn.ts` (`recalcAll`), `engine/evaluator.ts` (`userCall`, garde de profondeur 40 -> `#VALUE!`), `ui/dialogs/namedFns.ts`, `ui/appFns.ts`, `io/fnFormat.ts`.
- Stockage : champ optionnel `functions: {name, params, body}[]` du `.dktable` (anciens fichiers inchangés).
- Règles : les fonctions intégrées priment (nom refusé); mauvais nombre d'arguments -> `#VALUE!`; nom inconnu -> `#NAME?`.
- Limites : le corps ne doit lire que ses paramètres (les références du corps ne créent pas de dépendance); les définitions sont globales à l'application (un seul classeur ouvert).
- Tests : `engine/userfn.test.ts`, `io/fnFormat.test.ts`, `ui/dialogs/namedFns.test.ts`, `e2e/feat-fonctions-nommees.spec.ts`.
