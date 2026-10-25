# Validation des données (à l'épreuve du collage)

Règles par feuille, contrôlées partout où une valeur entre : saisie, collage, remplissage (Ctrl+D/R, poignée), ouverture/import. Dans Excel le collage contourne la règle ; ici non.

## Moteur (`src/engine/validation/`)
- `types.ts` : `ValRule { range, type: whole|decimal|list|length, min?, max?, items? }`, `Invalid { key, raw, message }`.
- `check.ts` : `checkValue(rule, raw)` (message ou null ; vide valide ; formule `=` ignorée pour les nombres ; virgule décimale acceptée) et `invalidCells(rules, getRaw, cols, rows)` (première règle en échec par cellule, ordre ligne par ligne).

## Données
- `DocSheet.validation?` dans `.dktable` (`io/validationFormat.ts`, validation stricte), `Entry.validation` dans le modèle, inclus dans l'annulation (un pas par modification de règles).

## UI
- `appValidation.ts` : pose `data-inv` sur les cellules invalides (`markInvalid`, appelé par `touch`) ; `notifyInvalid` après un collage/remplissage/ouverture : toast « N cellules invalides » + « Voir ».
- Hook `onBulk` de la grille (collage, Ctrl+D/R, poignée de recopie) ; `loadDoc`/`importSheet` appellent `notifyInvalid`.
- `ui/validation/panel.ts` (+ `form.ts`, `validation.css`) : menu Données / palette « Validation des données… » : règles (ajout, suppression) et liste des cellules invalides, « Corriger » (vide la cellule) / « Tout corriger » = un pas d'annulation via `app.fixInvalid`.
- API : `app.validationRules/setValidationRules/invalidCells/fixInvalid`.

## Limites
- Les valeurs invalides sont acceptées puis signalées (jamais refusées à la saisie) ; « Corriger » vide la cellule.
- Pas de règle sur formule personnalisée ni de liste issue d'une plage ; types : entier, décimal, liste, longueur.
- Tests : `engine/validation/check.test.ts`, `io/format.validation.test.ts`, `ui/appValidation.test.ts`, `ui/validation/panel.test.ts`, e2e `e2e/feat-validation.spec.ts`.
