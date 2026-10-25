# Rapport : Statistiques descriptives
Statut : en-cours
Visible : non

## Fait
- Module pur `src/engine/stats/descriptive.ts` (`describeValues`, `isDescriptiveError`) : moyenne, médiane, mode, écart-type, variance, min, max, étendue, somme, nombre.
- Tests `src/engine/stats/descriptive.test.ts` (8 cas, écrits avant le code, rouge puis vert).
- Doc `docs/statistiques-descriptives.md`.

## Non fait
- Pas de fonction de feuille ni de commande UI : la carte ne demande pas de rendu visible. Un branchement (ex. fonction ou dialogue « Outils d'analyse ») reste à faire.

## Captures

## Decisions
- Design `docs/design/2026-10-25-200330.html` : traite des analyses what-if (Valeur cible, Scénarios, Espion), sans rapport avec les statistiques descriptives. Non suivi ; le module ne dépend d'aucune maquette.
- Erreurs de cellule propagées (convention du moteur, comme `collectNums`), la carte ne précisant que les non-numériques.
- Variance et écart-type réutilisent `variance()` de `fn-stats.ts` (n-1) ; une valeur seule -> `null` au lieu de `#DIV/0!`.
- Chemins probables `src/commands/descriptiveStats.ts` et `tests/descriptive.test.ts` non créés : le projet n'a pas de dossier `src/commands/` et les tests sont co-localisés (`*.test.ts`).
- Mode absent (aucune répétition) -> `null`, pas d'erreur.

## Preuves
- Tests : ok (8 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"count":8,"scope":"related"},"tsc":{"ok":true}} -->
