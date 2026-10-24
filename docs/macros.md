# Macros Lua

Les macros sont des scripts Lua 5.3 enregistrés dans le classeur (`.dktable`, champ `macros`).

## Accès

- `Alt+F11` ou palette `Ctrl+K` > « Éditeur de macros » : ouvre le panneau droit.
- Palette `Ctrl+K` > « Macro : <nom> » : exécute une macro sans ouvrir le panneau (une erreur ouvre le panneau sur la macro).
- Dans l'éditeur : `Ctrl+Entrée` exécute, `Ctrl+Espace` force l'autocomplétion.
- Liste : double-clic ou `F2` pour renommer ; clic droit pour exécuter, renommer, supprimer.

Une exécution = un seul pas d'annulation (`Ctrl+Z` annule toutes les écritures de la macro).

## API `sheet` (feuille active)

| Fonction | Retour | Effet |
|---|---|---|
| `sheet.getValue(ref)` | nombre, texte, booléen | Valeur calculée (`""` si vide, code d'erreur en texte : `"#DIV/0!"`). |
| `sheet.getDisplay(ref)` | texte | Valeur affichée. |
| `sheet.getRaw(ref)` | texte | Saisie brute, formule comprise. |
| `sheet.getRangeValues(range)` | table | Valeurs numériques d'une plage, ligne par ligne. |
| `sheet.setCell(ref, v)` | | Écrit un nombre, un texte, une formule (`"=A1*2"`), un booléen ; `nil` efface. Les dépendants sont recalculés. |
| `sheet.selection()` | texte | Sélection courante (`"B2"` ou `"A1:C4"`). |
| `sheet.select(ref)` | | Sélectionne une cellule. |
| `sheet.name()` | texte | Nom de la feuille active. |

`print(...)` écrit dans la ligne de sortie du panneau.

## Bac à sable

Bibliothèques disponibles : base (sans `dofile`, `loadfile`, `require`), `string`, `table`, `math`, `utf8`, `coroutine`, `os` limité à `time`, `date`, `clock`, `difftime`. Pas d'`io`, ni de `package`, ni de `debug`. Une exécution est interrompue après 10 millions d'instructions.

## Exemple

```lua
local total = 0
for _, v in ipairs(sheet.getRangeValues("A1:A10")) do total = total + v end
sheet.setCell("A11", total)
print("Total", total)
```
