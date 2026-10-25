# Rapport : Moyenne mobile et lissage
Statut : termine
Visible : oui

## Fait

- `MOVING_AVERAGE(plage; fenêtre)` : moyenne glissante, déversée en colonne (`src/engine/fn-smooth.ts`).
- `EXP_SMOOTH(plage; alpha)` : lissage exponentiel s_1 = x_1, s_t = alpha*x_t + (1-alpha)*s_(t-1) (`src/engine/fn-smooth.ts`).
- Enregistrées dans `SPILL_FORMS` (`src/engine/fn-spill.ts`), comme SPLIT/UNIQUE/FILTER/SORT.
- Tests unitaires : `src/engine/fn-smooth.test.ts` (écrit avant le code, rouge puis vert).
- Test e2e : `e2e/feat-lissage.spec.ts` (déversement réel dans la grille, clair + sombre).
- Docs FR barre latérale + autocomplétion (`src/ui/fndocs-spill.ts`), test `src/ui/fndocs-smooth.test.ts` (rouge puis vert); `fndocs.test.ts` accepte `_` dans les noms.
- Doc utilisateur : `docs/lissage.md`.

## Non fait

## Captures

- docs/screenshots/moyenne-mobile-et-lissage/resultat-clair.png
- docs/screenshots/moyenne-mobile-et-lissage/resultat-sombre.png

## Decisions
- Hors carte : Pas de format de nombre automatique : les résultats s'affichent en précision brute (ex. 6.3333333333). Relève du format de cellule, hors périmètre.

- Pas de dossier `src/stats/` ni `src/formulas/registry.ts` (inexistants) : le moteur est `src/engine/`, les fonctions de débordement suivent `SPILL_FORMS`.
- Noms : `MOVING_AVERAGE` et `EXP_SMOOTH` (la carte ne fixe pas de nom).
- Entrée : plage à une seule colonne ou une seule ligne (sinon `#VALUE!`); le résultat est toujours une colonne.
- Erreurs : fenêtre < 1, non entière, ou > nombre de valeurs -> `#NUM!`; alpha hors de ]0;1] -> `#VALUE!`. Une erreur dans la plage se propage.
- Moyenne mobile : les `fenêtre - 1` premières positions sont vides; une fenêtre contenant une case vide ou non numérique donne une case vide.
- Lissage : s_1 = x_1; une case vide ou non numérique donne une case vide et ne met pas s à jour.
- Le design `docs/design/2026-10-25-212335.html` (valeur cible, espion, remplissage instantané) ne traite pas de ce sujet; pas de construction dessus.

## Preuves
- Tests : ok (385 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/moyenne-mobile-et-lissage/resultat-clair.png, docs/screenshots/moyenne-mobile-et-lissage/resultat-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"count":385,"scope":"related"},"tsc":{"ok":true}} -->
