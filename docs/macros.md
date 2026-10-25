# Macros Lua

Les macros sont des scripts Lua 5.3 enregistrés dans le classeur (`.dktable`, champ `macros`).

## Accès

- `Alt+F11`, menu Scripts > « Macros » ou palette `Ctrl+K` > « Macros » : ouvre/ferme la liste des macros (panneau droit, sans code).
- Liste : « + Nouvelle » crée une macro et ouvre son éditeur ; ▶ exécute ; le crayon (ou un clic sur la ligne) ouvre l'éditeur ; `F2` ou clic droit pour renommer, exécuter, supprimer.
- L'éditeur s'ouvre en plein écran dans un onglet (`</>` + nom) à côté des feuilles et des documents : clic = afficher, double-clic ou `F2` = renommer, `Suppr` ou clic droit = fermer l'onglet (la macro est conservée).
- Palette `Ctrl+K` > « Macro : <nom> » : exécute une macro sans ouvrir l'éditeur (une erreur ouvre la liste et affiche le message).
- Dans l'éditeur : `Ctrl+Entrée` exécute (résultat sous le code), `Ctrl+Espace` force l'autocomplétion.

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
