# Recopie de séries (poignée de recopie)

Le cran carré au coin bas-droit de la sélection prolonge les valeurs, comme Excel / Google Sheets.

## Utilisation

- **Glisser** le cran vers le bas, le haut, la droite ou la gauche. Une zone teintée et la dernière valeur s'affichent pendant le glisser. Relâcher écrit; Ctrl+Z annule d'un coup.
- **Ctrl** (au relâchement) inverse: un nombre seul devient une série +1; une date, « Item 1 » ou un mois seuls sont recopiés; plusieurs valeurs sont recopiées en boucle.
- **Double-clic** sur le cran: recopie vers le bas jusqu'à la fin des données de la colonne voisine (gauche, sinon droite).
- Plusieurs lignes/colonnes sélectionnées: chacune est prolongée séparément.

## Séries reconnues (dans cet ordre)

| Source | Résultat |
|---|---|
| `1, 2, 3` / `2, 4` / `0.1, 0.2` / `5, 3` | pas constant (sinon tendance linéaire, moindres carrés) |
| `7` seul | copie (`7, 7, 7`) |
| `2024-01-31, 2024-02-29` ou `01/01/2024, 01/02/2024` | mois (jour ramené en fin de mois), années, jours (pas constant); `2024-02-28` seul = +1 jour |
| vendredi puis lundi (jours ouvrés) | jours ouvrés (le week-end est sauté) |
| `lundi`, `janv.`, `Mars`, `JEUDI` | cycle FR, casse conservée; pas déduit de deux valeurs (`lundi, mercredi, vendredi…`) |
| `Item 1`, `T1, T3`, `A007` | texte + nombre final (pas 1 si un seul, zéros de tête conservés) |
| tout le reste, cellules vides | motif répété |
| formules | motif répété avec décalage des références relatives (`$` fixes) |

Vers le haut / la gauche, la série continue à rebours (une source seule décroît: `mercredi` → `mardi`).

## Code

`src/engine/series.ts` (+ `series-names.ts`, `series-date.ts`): `extendSeries`, pur. `src/ui/grid/seriesFill.ts`: `seriesPlan`, `autoFillEnd`. `src/ui/grid/fillHandle.ts`: souris, aperçu. Tests: `series.test.ts`, `seriesFill.test.ts`, `fillHandle.test.ts`, e2e `feat-fillhandle.spec.ts`.

## Limites

Styles et formats non recopiés; pas de défilement automatique pendant le glisser; une date stockée en numéro de série (format Date) est une suite de nombres (jours); on ne réduit pas la zone en glissant vers l'intérieur.
