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

## Interface (Données > Sous-totaux…)

- `src/engine/subtotalsPlan.ts` : `buildSubtotalPlan(table, header, spec)` -> `{ rows, levels }` (pur). Données au niveau = nombre de colonnes de groupe, sous-total du niveau l au niveau l, total général au niveau 0 : replier un sous-total masque ses données (`engine/outline.ts`).
- `src/ui/dialogs/subtotals.ts` : boîte. Colonne de groupe (une seule dans l'UI), fonction (Somme, Nombre, Moyenne, Min, Max), colonnes à totaliser (au moins une, Valider désactivé sinon), case « première ligne est un en-tête ». Colonnes relatives à la sélection.
- `src/ui/dialogs/subtotalsApply.ts` : `applySubtotals` écrit le plan à partir de la sélection (en un pas d'annulation via `app.editMany`), pose les niveaux (`app.setOutlineLevels`). Refus (message, rien écrit) si une cellule sous la sélection serait écrasée. `removeSubtotals` (« Tout supprimer ») rétablit le contenu d'origine et retire le plan.
- Plan gardé en mémoire par feuille (pas dans le `.dktable`) : après rechargement, « Tout supprimer » ne marche plus, il faut annuler ou effacer à la main.
- Menu : Données > Sous-totaux…. Tests : `subtotalsPlan.test.ts`, `subtotalsApply.test.ts`, `subtotals.test.ts`; e2e `e2e/feat-sous-totaux.spec.ts` (captures `docs/screenshots/boite-de-dialogue-sous-totaux/`).

## Hors périmètre

- Plusieurs colonnes de groupe dans l'interface (le moteur accepte 1 à 3).
- Persistance du plan dans le fichier; suppression après modification manuelle des sous-totaux.
- Formules de la zone écrite : copiées telles quelles (texte brut), pas de décalage de références.
