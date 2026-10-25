# Débordement (spill) et fonctions Sheets

- Fonctions : `SPLIT(texte; sep)` (ligne), `UNIQUE(plage)`, `FILTER(plage; condition)` (ex. `A1:A9>2`), `SORT(plage; colonne; croissant)`.
- Code : `engine/fn-spill.ts` (calculs purs), `engine/spill.ts` (déversement, libération, blocage), `engine/evaluator.ts` (`spillResult`), `engine/recalc.ts` (`compute`).
- La formule de tête garde sa valeur [0][0]; les autres cellules reçoivent des valeurs (pas de texte brut), suivies dans `State.spills`.
- Zone bloquée (cellule non vide ou bord de feuille) : `#SPILL!` dans la tête; taper dans la zone bloque, vider libère.
- Dans une expression (`=SORT(A1:A3)&"!"`) seule la première valeur est utilisée.
- Limites : pas de références `A1#`; un dépendant d'une cellule déversée est recalculé hors ordre topologique strict; pas de cycle détecté via la zone.
- Tests : `engine/spill.test.ts`, `e2e/feat-spill.spec.ts`.
