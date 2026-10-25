# Plan (outline) : niveaux de lignes et état replié

Module pur `src/engine/outline.ts`, sans DOM. Base de la carte « Sous-totaux avec plan repliable ».

## Modèle
- `levels[i]` : niveau de la ligne i (0 à `MAX_LEVEL` = 3; 0 jamais masquée, 3 détail le plus profond).
- `collapsed` : plis `{row, depth}` (sous-total replié + profondeur). Groupe de profondeur d = suite de lignes de niveau ≥ d juste au-dessus du sous-total (comme Excel). Repli manuel : d = niveau du sous-total + 1.
- Un groupe = lignes contiguës au-dessus d'une ligne de sous-total de niveau strictement inférieur. Replier masque ce groupe.

## Usage
```ts
import { emptyOutline, setLevel, collapse, expand, showLevel, hiddenRows } from "./engine/outline";

let o = emptyOutline(7);
o = setLevel(o, 0, 2);          // ligne 0 : niveau 2
o = collapse(o, 2);             // replie le groupe dont la ligne 2 est sous-total
hiddenRows(o);                  // Set {0, 1}
o = expand(o, 2);               // déplie sans toucher aux sous-groupes repliés seuls
o = showLevel(o, 1);            // plis de profondeur 2 : masque seulement les niveaux > 1
```

## Décisions
- Index 0-based, comme `levels`.
- État = liste de plis : déplier (`expand` retire tous les plis de la ligne) un groupe ne déplie pas ses sous-groupes repliés séparément.
- `setLevel` lève `RangeError` hors de 0-3 ou pour une ligne absente.
- Limite : un groupe sans sous-total en dessous ne se replie pas.
- `showLevel(n)` ne masque jamais une ligne de niveau ≤ n, même avec des niveaux mélangés (ex. 3,1,3,0).

## Interface (grille)

- `ui/grid/outlineView.ts` : +/- dans la marge de l'en-tête de ligne (`.dkg-fold`, `aria-expanded`) sur chaque ligne qui a du détail au-dessus ; boutons 1 à 3 dans le coin (`.dkg-lvl`, cachés sans niveau > 0).
- `ui/grid/gridOutline.ts` : clics -> `GridView.outline` (`collapse`/`expand`/`showLevel(k-1)`), puis `changed` relance le masque. Les boutons ne sélectionnent pas la ligne et ne déclenchent pas l'édition (`mousedown`/`keydown` arrêtés).
- Masque : `ui/grid/gridFilter.ts` combine filtres et lignes repliées (même `order`), les numéros de ligne restent ceux de la feuille.
- API : `Grid.setOutline(o)`; app : `App.setOutlineLevels(levels)`, dev seulement `window.__dkOutline([...])` (pas encore de commande de groupement).
- Tests: `ui/grid/gridOutline.test.ts`; e2e `e2e/feat-plan-repliable.spec.ts` (captures `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/`).
