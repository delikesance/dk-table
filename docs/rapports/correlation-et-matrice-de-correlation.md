# Rapport : Corrélation et matrice de corrélation
Statut : en-cours
Visible : non

## Fait

- Corrélation de Pearson entre deux séries (`src/engine/stats/correlation.ts`, `pearson`) : paires ignorées si l'une des deux valeurs n'est pas un nombre fini, erreur `#DIV/0!` si une série a une variance nulle ou moins de deux paires.
- Matrice de corrélation N×N (`correlationMatrix`) : symétrique, diagonale à 1 pour une colonne non constante, `null` pour une colonne de variance nulle.

## Non fait

- Branchement UI / menu Données (pas de rendu visible dans cette carte).
- Fonction de feuille `CORREL` (hors périmètre de cette carte).

## Captures

Aucune (fonctionnalité interne, `Visible : non`).

## Decisions

- Module placé dans `src/engine/stats/` (à côté de `descriptive.ts`) et non dans `src/stats/` : le dossier existant est le bon emplacement.
- Pas de module `utils.ts` séparé : le calcul des paires tient dans `correlation.ts`, sous la limite de 200 lignes.

## Preuves
- Tests : ok (9 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"count":9,"scope":"related"},"tsc":{"ok":true}} -->
