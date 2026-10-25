# Valeur cible (Goal Seek)

Données > Valeur cible… (palette : « Valeur cible »). Trouve la constante de la cellule variable pour que la cellule formule atteigne la valeur cible (tolérance 1e-6, 300 évaluations max).

- Moteur : `src/engine/goalSeek.ts` + `goalSeekMath.ts` (sondes puis bissection). Boîte : `src/ui/dialogs/goalSeek.ts`.
- La recherche tourne sur une copie de la feuille : rien n'est écrit avant « Appliquer » (`app.edit`, annulable).
- Refus : variable contenant une formule, cible sans formule, cible non numérique, aucune solution / plafond atteint.
- Limite : les références vers d'autres feuilles ne sont pas résolues dans la copie.
- Tests : `src/engine/goalSeek.test.ts`, `src/ui/dialogs/goalSeek.test.ts`, e2e `e2e/feat-vues.spec.ts`.
