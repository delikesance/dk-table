# Consolidation de plages (moteur)

Module pur : `src/engine/consolidate.ts`. Tests : `src/engine/consolidate.test.ts`.

## Usage

```ts
import { consolidate } from "../engine/consolidate";

const out = consolidate(
  [{ name: "Nord", grid: nord }, { name: "Sud", grid: sud }],
  { fn: "SUM", topRow: true, leftCol: true },
);
```

- `grid` : grille de texte (lignes x colonnes), telle qu'affichée.
- `fn` : `SUM`, `COUNT`, `AVERAGE`, `MIN` ou `MAX` (même logique que `engine/aggregate.ts`).
- `topRow` : la première ligne de chaque source est un en-tête d'étiquettes de colonnes.
- `leftCol` : la première colonne de chaque source est un en-tête d'étiquettes de lignes.
- Sans étiquettes : agrégation par position (ligne i, colonne j).

## Règles

- Étiquettes : espaces retirés, identiques = fusionnées ; nouvelles étiquettes ajoutées dans l'ordre de première apparition.
- Étiquette vide : la ligne ou colonne concernée est ignorée.
- Textes et vides ignorés ; virgule décimale acceptée.
- Une cellule de sortie sans nombre contributeur vaut `""` (et non `0`).

## Non fait

- Pas d'UI : la boîte de dialogue Données > Consolider reste à faire.
- Pas de lecture directe du classeur : l'appelant fournit les grilles.
