# Rapport : Tables de simulation (Multiple Operations)
Visible : non

## Fait

- Moteur existant `src/engine/dataTable.ts` (`dataTable1`, `dataTable2`) reprend la carte sœur « tables de données à 1 ou 2 variables » (même fonctionnalité, source LibreOffice Multiple Operations).
- Cette tournée: ajout de la raison `bad-formula` (formule dont la syntaxe ne se lit pas), refusée avant toute écriture.
- Tests de non-modification de la feuille en cas de refus, et de recalcul quand valeurs ou formule changent.

## Non fait

- Rien dans les critères de la carte.

## Captures

Aucune (carte sans effet visible).

## Decisions

- Carte sans UI: le critère « outil pro pur moteur » est retenu; pas de `DataTableDialog` (chemins `src/formula/` et `src/ui/DataTableDialog.tsx` n'existent pas dans ce dépôt).
- Résultats calculés à la demande: pas de forme persistée, donc recalcul automatique par construction (test de non-régression).
- Hors carte (suite possible): UI Données > Table de données, rendu de la grille de résultats.
- Limite connue: dépendances inter-feuilles de la formule non recalculées pendant la substitution.
