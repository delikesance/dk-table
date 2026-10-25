# Formules portables entre langues et séparateurs

Le `.dktable` stocke toujours les formules en syntaxe canonique : `,` entre les arguments, `.` pour la décimale, `Feuille!A1`. Un fichier s'ouvre donc de la même façon dans toutes les langues.

L'interface suit la langue du navigateur (`navigator.language`) :

| Langue (exemple) | Séparateur d'arguments | Décimale | Formule affichée |
|---|---|---|---|
| en-US, en-GB | `,` | `.` | `=SUM(A1,2.5)` |
| fr-FR, de-DE, es-ES | `;` | `,` | `=SUM(A1;2,5)` |

## Où ça s'applique

- Barre de formule : affichage et saisie (`ui/toolbar/formulabar.ts`).
- Éditeur de cellule : ouverture et validation (`ui/grid/editor.ts`, `ui/grid/grid.ts`).
- Ctrl+Entrée (copie de la saisie sur la sélection, références décalées) : `shiftTyped`.
- Barre latérale : texte brut de la cellule (`ui/appGrid.ts`).
- Collage, remplissage et import : inchangés (ils travaillent déjà en syntaxe canonique).

## Règles de conversion (`engine/locale.ts`)

- Seul un texte commençant par `=` est converti. Un texte simple (`2,5`) reste tel quel.
- Les chaînes littérales (`"a,b"`), les noms de feuilles entre apostrophes (`'Mes, chiffres'!A1`) et les erreurs (`#N/A`) sont copiés sans changement.
- Les noms à point (`STDEV.S`) restent intacts.
- Un texte mal formé (guillemet non fermé) reste tel quel après le guillemet.

## Usage

```ts
import { fromLocale, syntaxFor, toLocale } from "../engine/locale";
const fr = syntaxFor("fr-FR");          // { argSep: ";", decimal: "," }
toLocale("=SUM(A1,2.5)", fr);            // "=SUM(A1;2,5)"
fromLocale("=SUM(A1;2,5)", fr);          // "=SUM(A1,2.5)"
```

L'UI passe par `ui/formula/syntax.ts` (`toInput`, `fromInput`, `shiftTyped`, `formulaSyntax`).

## Limites

- Les noms de fonctions restent en anglais (SUM, IF) : ils ne sont pas traduits.
- Les codes de format de `TEXT` (`"0.00"`) ne sont pas convertis : une chaîne est une donnée. Plus tard, TEXT seul pourrait accepter les codes locaux.
- La syntaxe `$Feuille.A1` (LibreOffice) n'est pas acceptée.
- La langue n'est pas réglable : elle suit le navigateur.
