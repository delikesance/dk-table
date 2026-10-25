# Sous-totaux et total général par groupes

Moteur pur (`src/engine/subtotals.ts`, agrégats dans `src/engine/aggregate.ts`), sans interface pour l'instant.

## Usage

```ts
import { subtotals } from "./engine/subtotals";

const rows = subtotals(table, { groups: [0, 1], values: [3], fn: "SUM" });
// rows: { kind: "data" | "sub" | "total", level?, cells }[]
```

- `table` : lignes de texte (`string[][]`), comme la grille.
- `groups` : colonnes de groupe, du niveau 0 (externe) au plus fin. 1 à 3 niveaux.
- `values` : colonnes agrégées. `fn` : `SUM`, `COUNT`, `AVERAGE`, `MIN`, `MAX`.

## Comportement

- Les lignes sont triées par les colonnes de groupe (ordre français, numérique), donc un tri manuel n'est pas requis.
- Après chaque groupe : un sous-total par niveau, du plus fin au plus large. Libellé « Total <valeur> » dans la colonne du niveau.
- Dernière ligne : « Total général », agrégat de toutes les lignes (pas somme des sous-totaux).
- Le texte et les vides ignorés. Nombres lus avec virgule ou point décimal.
- Résultat sans nombre : `AVERAGE`/`MIN`/`MAX` donnent `""`, `SUM`/`COUNT` donnent `0`.
- Arrondi à 15 chiffres significatifs (`0,1 + 0,2` donne `0.3`).
- Plage vide : `[]`, sans erreur. Sans colonne de groupe : données puis total général seul.
- Clé vide (cellule vide ou ligne courte) : groupe libellé « Total (vide) ».
- Plus de 3 colonnes de groupe (`MAX_LEVELS`) : `RangeError`.

## Hors périmètre

- Plan repliable, interface Données > Sous-totaux, lignes masquées.
- Carte parente « Sous-totaux avec plan repliable » : à reprendre pour l'UI.
