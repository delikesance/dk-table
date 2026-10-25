# Rapport : Moyenne mobile et lissage
Statut : en-cours
Visible : oui

## Fait

- `MOVING_AVERAGE(plage; fenêtre)` : moyenne glissante, déversée en colonne (`src/engine/fn-smooth.ts`).
- `EXP_SMOOTH(plage; alpha)` : lissage exponentiel s_1 = x_1, s_t = alpha*x_t + (1-alpha)*s_(t-1) (`src/engine/fn-smooth.ts`).
- Enregistrées dans `SPILL_FORMS` (`src/engine/fn-spill.ts`), comme SPLIT/UNIQUE/FILTER/SORT.
- Tests unitaires : `src/engine/fn-smooth.test.ts` (écrit avant le code, rouge puis vert).
- Test e2e : `e2e/feat-lissage.spec.ts` (déversement réel dans la grille, clair + sombre).

## Non fait

- Pas de format de nombre automatique : les résultats s'affichent en précision brute (ex. 6.3333333333), la colonne est tronquée à droite. Relève du format de cellule, hors périmètre.
- Pas de documentation utilisateur dédiée dans `docs/` (la doc est dans les commentaires JSDoc du module).

## Captures

- `docs/screenshots/moyenne-mobile-et-lissage/resultat-clair.png` : MOVING_AVERAGE (C) et EXP_SMOOTH (E) déversées, thème clair.
- `docs/screenshots/moyenne-mobile-et-lissage/resultat-sombre.png` : idem, thème sombre.

## Decisions

- Pas de dossier `src/stats/` ni `src/formulas/registry.ts` (inexistants) : le moteur est `src/engine/`, les fonctions de débordement suivent `SPILL_FORMS`.
- Noms : `MOVING_AVERAGE` et `EXP_SMOOTH` (la carte ne fixe pas de nom).
- Entrée : plage à une seule colonne ou une seule ligne (sinon `#VALUE!`), parcourue dans l'ordre; le résultat est toujours une colonne.
- Erreurs : fenêtre < 1, non entière, ou > nombre de valeurs -> `#NUM!`; alpha hors de ]0;1] -> `#VALUE!` (erreur de valeur, exigée par le critère d'acceptation; était `#NUM!`). Une erreur dans la plage se propage.
- Moyenne mobile : les `fenêtre - 1` premières positions sont vides; une fenêtre contenant une case vide ou non numérique donne une case vide (pas de moyenne partielle).
- Lissage : s_1 = x_1 (première valeur numérique); une case vide ou non numérique donne une case vide et ne met pas s à jour.
- Le design `docs/design/2026-10-25-200330.html` ne traite pas de ce sujet (pas de moyenne mobile ni de lissage); pas de construction dessus.

## Preuves
- Tests : ok (931 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"count":931,"scope":"related"},"tsc":{"ok":true}} -->
