# Statistiques descriptives

Module pur `src/engine/stats/descriptive.ts` : `describeValues(values)` calcule
count, sum, mean, median, mode, variance, stdev, min, max, range sur une liste de valeurs de cellules.

Usage :

```ts
const r = describeValues([2, 4, 4, 4, 5, 5, 7, 9]);
if (isDescriptiveError(r)) { /* r.message : texte clair */ }
else r.mean; // 5
```

Règles :
- Vides, texte et booléens ignorés; une erreur de cellule se propage (`error`).
- Aucune valeur numérique -> `#VALUE!` avec message « Aucune valeur numérique dans la plage ».
- Variance et écart-type sur l'échantillon (n-1); une seule valeur -> `null`.
- Mode `null` si aucune valeur ne se répète (premier atteignant le plus fort compte en cas d'égalité).

Tests : `src/engine/stats/descriptive.test.ts` (`npx vitest run src/engine/stats`).
