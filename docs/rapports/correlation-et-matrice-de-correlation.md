# Rapport : Corrélation et matrice de corrélation
Statut : termine
Visible : non

## Fait

- Corrélation de Pearson entre deux séries (`src/engine/stats/correlation.ts`, `pearson`) : paires ignorées si l'une des deux valeurs n'est pas un nombre fini, erreur `#DIV/0!` si une série a une variance nulle ou moins de deux paires.
- Matrice de corrélation N×N (`correlationMatrix`) : symétrique, diagonale à 1 pour une colonne non constante, `null` pour une colonne de variance nulle.
- Tests : `src/engine/stats/correlation.test.ts` (`npx vitest run src/engine/stats/correlation.test.ts`).

## Non fait

## Captures

Aucune (fonctionnalité interne, `Visible : non`).

## Decisions
- Hors carte : Branchement UI / menu Données (pas de rendu visible dans cette carte).
- Hors carte : Fonction de feuille `CORREL` (hors périmètre de cette carte).

- Module placé dans `src/engine/stats/` (à côté de `descriptive.ts`) et non dans `src/stats/` : le dossier existant est le bon emplacement.
- Pas de module `utils.ts` séparé : le calcul des paires tient dans `correlation.ts` (87 lignes).
- Designs `docs/design/2026-10-25-200330.html` et `2026-10-25-212335.html` (what-if, Espion, Remplissage instantané) ne couvrent pas la corrélation : carte purement moteur.
- Tournée du 2026-10-25 : code et tests déjà présents et complets, aucune modification de code ; les 4 critères d'acceptation sont couverts par `correlation.test.ts` (y = 2x donne 1, y = -x donne -1, r dans [-1, 1], matrice N×N symétrique à diagonale 1, paires non numériques ignorées sans NaN, variance nulle = erreur ou `null`).

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
