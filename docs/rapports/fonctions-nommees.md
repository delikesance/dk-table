# Rapport : Fonctions nommées
Statut : termine
Visible : oui

## Fait
- Moteur : registre + expansion d'appel (`userfnStore.ts`), nœud `err` portant le nom pour les paramètres, recalcul (`recalcAll`).
- Format `.dktable` : champ `functions` optionnel (`io/fnFormat.ts`), rétrocompatible.
- UI : Données > Fonctions nommées… (`ui/dialogs/namedFns.ts`), `App.getFunctions/setFunctions`.
- Doc : `docs/fonctions-nommees.md`.

## Non fait
- Références du corps hors paramètres non suivies comme dépendances; pas d'autocomplétion des fonctions nommées.

## Preuves
- Tests : ok (1939 tests; `tsc --noEmit` ok)
- Captures : docs/screenshots/fonctions-nommees/dialogue-clair.png, docs/screenshots/fonctions-nommees/dialogue-sombre.png, docs/screenshots/fonctions-nommees/resultat-clair.png, docs/screenshots/fonctions-nommees/resultat-sombre.png

## Decisions
- Paramètres en lettres seules : un nom comme `a1` serait lu comme une cellule.
- Substitution d'AST (pas de portée) : simple, récursion bornée par une profondeur max.
- Registre global au module, aligné sur le classeur ouvert (rechargé à chaque `loadDoc`).
