# Rapport : Régression linéaire

Visible : non

## Fait

- `linearRegression(xs, ys)` dans `src/engine/stats/regression.ts` : pente, ordonnée à l'origine, R² et nombre de paires, par moindres carrés.
- Paires exclues si une valeur n'est pas un nombre fini (texte, vide, booléen, erreur).
- Erreur explicite si moins de 2 paires valides ou x constant (`#DIV/0!` + message).
- Tests : `src/engine/stats/regression.test.ts` (y = 2x + 1, R² borné, exclusion, erreurs).

## Non fait

- Branchement UI / fonction de feuille `LINEST`/`SLOPE`/`INTERCEPT`/`RSQ` (hors périmètre de cette carte, moteur seul).
- Documentation utilisateur dédiée (la doc de module est dans le fichier).

## Captures

Aucune (fonctionnalité interne, `Visible : non`).

## Decisions

- Emplacement `src/engine/stats/regression.ts` (à côté de `correlation.ts`), et non `src/stats/` : le dossier existant est le bon emplacement. Pas de `utils.ts` séparé : le calcul tient dans un seul module.
- Design `docs/design/2026-10-25-212335.html` (Valeur cible, Espion, Remplissage instantané) ne couvre pas la régression : carte purement moteur, sans design dédié.
- Exclusion par paire (comme `pearson`) : une paire est retenue seulement si x et y sont des nombres finis.
- Erreur explicite (`#DIV/0!`) si moins de 2 paires valides ou x constant ; jamais de NaN.
- Y constant (pente 0) : R² = 1 (droite exacte), pas d'erreur.
