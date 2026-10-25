# Rapport : Tables de données à 1 ou 2 variables
Statut : en-cours
Visible : non

## Fait

- Plan: moteur pur `src/engine/dataTable.ts` (table à 1 variable: une liste de valeurs, une formule; table à 2 variables: une grille lignes x colonnes), tests d'abord dans `src/engine/dataTable.test.ts`.
- Chaque intersection substitue les valeurs dans les cellules d'entrée, lit la formule, puis restaure la saisie d'origine.
- Erreurs explicites: référence d'entrée invalide ou dupliquée, entrée circulaire, cellule résultat non formule.
- Les saisies d'origine des cellules d'entrée sont restaurées dans un `finally`, même en cas d'exception.
- Tests: `src/engine/dataTable.test.ts` (12 cas, 1 et 2 variables, erreurs, restauration).

## Non fait

- UI (dialogue Données > Table de données…, palette) et rendu de la grille de résultats: hors périmètre de cette carte.
- Pas de forme `{=TABLE(...)}` persistée dans le classeur: le résultat est calculé à la demande.
- Mode de calcul manuel: `setCell` ne recalcule que la cellule éditée, donc la lecture de la formule peut être périmée. À traiter avant branchement UI (lecture forcée via `recalcOne`/`recalcSheet`).

## Captures

Aucune (carte sans effet visible).

## Decisions

- Secteur implémentation: le design `docs/design/2026-10-25-212335.html` porte sur Valeur cible, Espion et Remplissage instantané, pas sur les tables de données. Aucun contrat de design à suivre pour cette carte: l'API suit `goalSeek.ts` (même patron: substitution, lecture, restauration).
- Visible: non (moteur pur, sans UI), selon la consigne de la carte.
- « Circulaire » = la cellule d'entrée dépend (directement ou non) de la cellule résultat: la substitution créerait un cycle.
- Les valeurs de la table sont des saisies brutes (texte ou nombre) passées à `setCell`, comme la saisie utilisateur.

## Preuves
- Tests : ok (12 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"count":12,"scope":"related"},"tsc":{"ok":true}} -->
