# Rapport : Statistiques descriptives
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
- Design `docs/design/2026-10-25-200330.html` : traite des analyses what-if (Valeur cible, Scénarios, Espion), sans rapport avec les statistiques descriptives. Non suivi ; le module ne dépend d'aucune maquette.
- Erreurs de cellule propagées (convention du moteur, comme `collectNums`).
- Variance et écart-type réutilisent `variance()` de `fn-stats.ts` (n-1) ; une valeur seule -> `null` au lieu de `#DIV/0!`.
- Chemins probables `src/commands/descriptiveStats.ts` et `tests/descriptive.test.ts` non créés : le projet n'a pas de dossier `src/commands/` et les tests sont co-localisés (`*.test.ts`).
- Mode absent (aucune répétition) -> `null`, pas d'erreur.
