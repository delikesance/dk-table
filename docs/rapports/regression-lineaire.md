# Rapport : Régression linéaire
Visible : non

## Fait

- `linearRegression(xs, ys)` dans `src/engine/stats/regression.ts` : pente, ordonnée à l'origine, R² et nombre de paires, par moindres carrés.
- Paires exclues si une valeur n'est pas un nombre fini (texte, vide, booléen, erreur).
- Erreur explicite si moins de 2 paires valides ou x constant (`#DIV/0!` + message).
- Tests : `src/engine/stats/regression.test.ts` (y = 2x + 1, R² borné, exclusion, erreurs).

## Non fait

## Captures

Aucune (fonctionnalité interne, `Visible : non`).

## Decisions

- Emplacement `src/engine/stats/regression.ts` (à côté de `correlation.ts`), et non `src/stats/` : le dossier existant est le bon emplacement. Pas de `utils.ts` séparé : le calcul tient dans un seul module.
- Design `docs/design/2026-10-25-220125.html` présent, mais la carte est purement moteur : aucun écran à construire dessus.
- Exclusion par paire (comme `pearson`) : une paire est retenue seulement si x et y sont des nombres finis.
- Erreur explicite (`#DIV/0!`) si moins de 2 paires valides ou x constant ; jamais de NaN.
- Y constant (pente 0) : R² = 1 (droite exacte), pas d'erreur.
- Hors carte (suite possible, non traité ici) : branchement UI et fonctions de feuille `LINEST`/`SLOPE`/`INTERCEPT`/`RSQ`, documentation utilisateur dédiée.
