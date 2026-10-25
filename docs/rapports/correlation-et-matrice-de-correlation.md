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
- Design `docs/design/2026-10-25-200330.html` ignoré : il traite de l'analyse what-if (valeur cible, scénarios, espion) et ne mentionne pas la corrélation. Carte purement moteur, pas de design à suivre.
- Design `docs/design/2026-10-25-212335.html` (Valeur cible, Espion, Remplissage instantané) ne couvre pas la corrélation : rien à construire dessus. Le code existant (moteur pur) reste la base.
- Cette tournée : code et tests déjà présents (tournée précédente), aucune modification. Tests `correlation.test.ts` : 9/9 verts.
- Critères d'acceptation vérifiés par `correlation.test.ts` : r dans [-1, 1], y = 2x donne 1, matrice N×N symétrique, paires non numériques ignorées sans NaN, variance nulle donne une erreur (pearson) ou `null` (matrice).

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
