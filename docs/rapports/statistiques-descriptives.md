# Rapport : Statistiques descriptives
Statut : en-cours
Visible : non

## Fait
- Module pur `src/engine/stats/descriptive.ts` (`describeValues`, `isDescriptiveError`) : moyenne, médiane, mode, écart-type, variance, min, max, étendue, somme, nombre.
- Critères : valeurs vides, texte et booléens ignorés ; variance et écart-type sur n-1 (échantillon) ; aucune valeur numérique -> erreur `#VALUE!` avec message « Aucune valeur numérique dans la plage » ; erreur de cellule propagée.
- Tests `src/engine/stats/descriptive.test.ts` (8 cas, écrits avant le code).
- Doc `docs/statistiques-descriptives.md`.

## Non fait
- Pas de fonction de feuille ni de commande UI (dialogue « Outils d'analyse ») : hors critères de la carte, à reprendre si besoin d'un rendu.

## Captures
Sans objet (pas d'effet visible).

## Decisions
- Design `docs/design/2026-10-25-204816.html` (demandé par la consigne) : traite de Valeur cible et d'évaluation pas à pas, sans rapport avec les statistiques descriptives. Non suivi ; le module ne dépend d'aucune maquette.
- Tests relancés cette tournée : `npx vitest run src/engine/stats/descriptive.test.ts` = 8/8 verts.
- Erreurs de cellule propagées (convention du moteur, comme `collectNums`).
- Variance et écart-type réutilisent `variance()` de `fn-stats.ts` (n-1) ; une valeur seule -> `null` au lieu de `#DIV/0!`.
- Chemins probables `src/commands/descriptiveStats.ts` et `tests/descriptive.test.ts` non créés : le projet n'a pas de dossier `src/commands/` et les tests sont co-localisés (`*.test.ts`).
- Mode absent (aucune répétition) -> `null`, pas d'erreur.

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
