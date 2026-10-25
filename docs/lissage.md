# Moyenne mobile et lissage

Deux fonctions à déversement (`src/engine/fn-smooth.ts`, enregistrées dans `SPILL_FORMS`), résultat toujours en colonne.

## MOVING_AVERAGE(plage; fenêtre)

- Moyenne des `fenêtre` dernières valeurs à chaque position.
- Les `fenêtre - 1` premières positions sont vides.
- Fenêtre contenant une case vide ou non numérique : case vide (pas de moyenne partielle).
- Fenêtre < 1, non entière ou > nombre de valeurs : `#NUM!`.

## EXP_SMOOTH(plage; alpha)

- s_1 = x_1, puis s_t = alpha*x_t + (1-alpha)*s_(t-1).
- alpha hors de ]0;1] : `#VALUE!`.
- Case vide ou non numérique : case vide, s n'est pas mis à jour.

## Commun

- Plage à une seule ligne ou une seule colonne, sinon `#VALUE!`; une erreur dans la plage se propage.
- Exemple : `=MOVING_AVERAGE(B2:B13; 3)`, `=EXP_SMOOTH(B2:B13; 0,5)`.
- Documentées dans la barre latérale et l'autocomplétion (`src/ui/fndocs-spill.ts`).
