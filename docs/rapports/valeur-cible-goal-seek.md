# Rapport : Valeur cible (Goal Seek)
Visible : oui

## Fait
- Moteur `src/engine/goalSeek.ts` + `goalSeekMath.ts` (déjà présent, 98 lignes de tests).
- Boîte `src/ui/dialogs/goalSeek.ts` : cellule formule, valeur cible, cellule variable; « Rechercher » travaille sur une copie, « Appliquer » écrit (annulable) après confirmation.
- Refus formule en variable, cible sans formule, cible non numérique; échec signalé (aucune solution / plafond).
- Entrées : menu Données > Valeur cible…, palette.
- Tests écrits d'abord : `src/ui/dialogs/goalSeek.test.ts` (4), e2e `e2e/feat-vues.spec.ts`. Doc : `docs/valeur-cible.md`, CLAUDE.md.

## Non fait

## Captures
- docs/screenshots/valeur-cible-goal-seek/valeur-cible-initial-clair.png
- docs/screenshots/valeur-cible-goal-seek/valeur-cible-initial-sombre.png
- docs/screenshots/valeur-cible-goal-seek/valeur-cible-resultat-clair.png
- docs/screenshots/valeur-cible-goal-seek/valeur-cible-resultat-sombre.png

## Decisions
- Fichiers de la carte (`.tsx`, `src/formula/`) inexistants : projet TS/DOM, code dans `src/engine/` et `src/ui/dialogs/`.
- Le moteur garde sa recherche (sondes + bissection) au lieu de `solve.ts` (taux > -1 seulement, inadapté à une entrée quelconque).
- Références inter-feuilles non résolues dans la copie (limite connue).
