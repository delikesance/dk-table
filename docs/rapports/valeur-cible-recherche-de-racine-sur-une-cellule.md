# Rapport : Valeur cible (recherche de racine sur une cellule)
Visible : non

## Fait

- Moteur pur de recherche de racine (`src/engine/goalSeekMath.ts`) : bracket par sondes doublées autour du point de départ, puis bissection. Tolérance absolue 1e-6, plafond d'itérations.
- Liaison au moteur (`src/engine/goalSeek.ts`) : `goalSeek(sheet, formulaKey, varKey, target)` ajuste une constante numérique pour qu'une cellule formule atteigne la cible.
- Erreurs explicites (`reason`) : cible non finie, cellule résultat non formule, cellule variable non constante, pas de racine, plafond atteint.
- Valeur d'origine de la cellule variable restaurée en cas d'échec ; `original` renvoyé pour que l'appelant puisse annuler un succès.
- Tests (`src/engine/goalSeek.test.ts`, 11 cas) couvrent les quatre critères d'acceptation.

## Non fait

(rien : critères d'acceptation couverts par le moteur)

## Captures

Aucune (pas d'effet visible dans cette carte).

## Decisions

- Recherche par bracket + bissection plutôt que Newton : `solve.ts` est limité aux taux (> -1, grille fixe). Bissection = convergence garantie si la cellule est continue.
- Écriture de la valeur sondée arrondie à 15 chiffres significatifs : au-delà, `recalc.ts` stocke le nombre en texte exact (`longnum.ts`) et la cellule ne serait plus numérique.
- Tolérance absolue 1e-6 sur `résultat - cible`.
- Plafond = 300 évaluations de la formule (sondes d'encadrement + bissection), option `maxEval`.
- Annulation utilisateur : le moteur ne sait pas que l'utilisateur annule. Il renvoie `original` ; c'est à l'UI de réécrire cette valeur si l'utilisateur annule après un succès.
- Hors de cette carte (carte suivante) : pas d'UI (menu Données, dialogue, palette). La partie moteur est prête.
- Hors de cette carte : tables de données et autres parties de la carte parente.
