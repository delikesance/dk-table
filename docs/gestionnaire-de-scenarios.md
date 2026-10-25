# Gestionnaire de scénarios

Jeux nommés de valeurs d'entrée (ex. « Base », « Pire », « Meilleur ») : un clic applique un scénario, puis le classeur recalcule.

## Usage

1. Sélectionner les cellules d'entrée (feuille active), par exemple `A1` ou `A1:A3`.
2. Données > Scénarios…, saisir un nom, « Enregistrer la sélection ».
3. Pour basculer : Données > Scénarios…, « Appliquer » à côté du scénario (la boîte se ferme pour montrer le résultat).

Règles :
- 32 cellules variables au plus par scénario ; au-delà, un message l'indique et rien n'est enregistré.
- Nom unique (sans tenir compte de la casse), non vide.
- Une cellule vide de la sélection est enregistrée vide (l'application efface la valeur).
- Les scénarios sont enregistrés dans le `.dktable` (champ `scenarios`, validé à l'ouverture par `io/scenarioFormat.ts`).

## Code

- `engine/scenario.ts` : types, limite (`MAX_SCENARIO_CELLS`), ajout/suppression, capture (`selectionCells`), application (`applyScenario`). Pur.
- `engine/scenarioStore.ts` : registre du classeur ouvert (copies défensives).
- `io/scenarioFormat.ts` : validation du champ `scenarios`.
- `ui/appScenarios.ts` : branchement App (capture de la sélection, application via `batchEdit` = un pas d'annulation par feuille).
- `ui/dialogs/scenarios.ts` : boîte « Scénarios… » (menu Données).

Tests : `engine/scenario.test.ts`, `engine/scenarioStore.test.ts`, `io/scenarioFormat.test.ts`, `ui/dialogs/scenarios.test.ts`, e2e `e2e/feat-scenarios.spec.ts` (captures dans `docs/screenshots/gestionnaire-de-scenarios/`).

## Limites

- Annulation : un pas par feuille concernée, mais l'annulation globale (Ctrl+Z) ne couvre que la feuille active.
- Pas de scénario « Base / Pire / Meilleur » préremplis : les noms sont saisis par l'utilisateur.
- Pas de tableau de synthèse comparant les résultats des scénarios.
