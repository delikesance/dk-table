# Rapport : Statistiques descriptives
Visible : non

## Fait
- Module pur `src/engine/stats/descriptive.ts` (`describeValues`, `isDescriptiveError`) : moyenne, médiane, mode, écart-type, variance, min, max, étendue, somme, nombre.
- Critères : valeurs vides, texte et booléens ignorés ; variance et écart-type sur n-1 (échantillon) ; aucune valeur numérique -> erreur `#VALUE!` avec message « Aucune valeur numérique dans la plage » ; erreur de cellule propagée.
- Tests `src/engine/stats/descriptive.test.ts` (8 cas, écrits avant le code).
- Doc `docs/statistiques-descriptives.md`.
- Tournée du 2026-10-25 : critères revérifiés, aucun code à ajouter.

## Non fait
- Pas de fonction de feuille ni de commande UI : relève de la carte « Dialogue d'outils d'analyse et sortie en feuille ».

## Captures
Sans objet (pas d'effet visible).

## Decisions
- Design `docs/design/2026-10-25-204816.html` : il porte sur Valeur cible et l'évaluation pas à pas, sans rapport avec cette carte. Non suivi.
- Erreurs de cellule propagées (convention du moteur, comme `collectNums`).
- Variance et écart-type réutilisent `variance()` de `fn-stats.ts` (n-1) ; une valeur seule -> `null` au lieu de `#DIV/0!`.
- Chemins `src/commands/descriptiveStats.ts` et `tests/descriptive.test.ts` non créés : pas de dossier `src/commands/`, tests co-localisés (`*.test.ts`).
- Mode absent (aucune répétition) -> `null`, pas d'erreur.
