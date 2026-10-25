# Formats de nombre personnalisés

Code de format façon Excel (`0.0" cm"`), 1 à 4 sections séparées par `;` : positif ; négatif ; zéro ; texte.
La mise en forme change l'affichage, jamais la valeur stockée ni les calculs.

## Usage

- Menu **Format > Personnalisé…** : saisir le code, l'aperçu montre trois valeurs (`1234,5`, `-3`, `0`), puis **Appliquer** (le bouton reste inactif tant que le code est invalide, le message d'erreur est affiché sous le champ).
- Le format s'applique à la sélection (`app.style`), annulable comme les autres styles.

## Syntaxe

| Élément | Effet |
| --- | --- |
| `0` | chiffre obligatoire (zéros ajoutés) |
| `#` | chiffre facultatif |
| `?` | chiffre facultatif, espace à la place |
| `.` | séparateur décimal (affiché `,`) |
| `,` (entre chiffres) | séparateur de milliers (espace fine) |
| `%` | multiplie par 100 et affiche `%` |
| `@` | texte (dans la 4e section) |
| `"..."` ou `\x` | littéral |
| `€ $ - + ( ) :` et espace | littéraux sans guillemets |

Sections : 1 = tous les nombres (négatif précédé de `-`) ; 2 = positif;négatif (négatif affiché sans `-` automatique) ; 3 = + zéro ; 4 = + texte (`@`). Texte sans 4e section : inchangé.

Non pris en charge (code refusé avec message) : lettres sans guillemets (dates `jj/mm/aaaa`, `E+`…), plus de 4 sections.

## Stockage

Le code est stocké dans `CellStyle.format` avec le préfixe `custom:` (ex. `custom:0.0" cm"`). Pas de changement de schéma `.dktable` : les formats prédéfinis (`number`, `percent`, …) restent inchangés.

## Fichiers

- `src/ui/numfmtCustom.ts` : analyse (`parseCustom`, `checkCustom`) et rendu (`formatCustom`), pur.
- `src/ui/numfmt.ts` : `formatValue` délègue au code si le format commence par `CUSTOM` (`custom:`).
- `src/ui/dialogs/customFormat.ts` : dialogue (saisie, aperçu, Appliquer).
- `src/ui/menubar/spec.ts` : entrée « Personnalisé… » du menu Format.
- `src/ui/grid/cellkind.ts` + `grid.ts` + `appGrid.ts` (hook `numeric`) : un nombre avec unité dans une cellule à format personnalisé est aligné à droite.

## Tests

- `src/ui/numfmtCustom.test.ts` (rendu, sections, validation), `src/ui/dialogs/customFormat.test.ts`, `src/ui/grid/cellkind.test.ts` (alignement).
- `e2e/feat-format-personnalise.spec.ts` : parcours complet clair/sombre, captures dans `docs/screenshots/formats-de-nombre-personnalises/`.
