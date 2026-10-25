# Rapport : Tables de données à 1 ou 2 variables
Statut : en-cours
Visible : non

## Fait

- Moteur pur `src/engine/dataTable.ts` (table à 1 variable: une liste de valeurs; table à 2 variables: grille lignes x colonnes), tests dans `src/engine/dataTable.test.ts`.
- Chaque intersection substitue les valeurs dans les cellules d'entrée, lit la formule, puis restaure la saisie d'origine.
- Erreurs explicites: référence d'entrée invalide ou dupliquée, entrée circulaire, cellule résultat non formule.
- Les saisies d'origine des cellules d'entrée sont restaurées dans un `finally`, même en cas d'exception.
- Mode manuel: la formule résultat et ses dépendants sont recalculés à chaque substitution et après restauration (test d'abord, puis correction).

## Non fait

- Rien dans les critères de la carte.

## Captures

Aucune (carte sans effet visible).

## Decisions

- Design `docs/design/2026-10-25-220125.html` lu: il couvre Espion, Analyse rapide et Appareil photo, pas les tables de données. Aucun contrat de design à suivre: l'API suit `goalSeek.ts` (substitution, lecture, restauration).
- Visible: non (moteur pur, sans UI), selon la consigne de la carte.
- « Circulaire » = la cellule d'entrée dépend (directement ou non) de la cellule résultat: la substitution créerait un cycle.
- Les valeurs de la table sont des saisies brutes (texte ou nombre) passées à `setCell`, comme la saisie utilisateur.
- Hors carte (suite possible): UI (Données > Table de données…, palette) et rendu de la grille de résultats; forme `{=TABLE(...)}` persistée non prévue, le résultat est calculé à la demande.
- Propagation en mode manuel: `recalc` (dépendants de la feuille seulement). Les dépendances inter-feuilles de la formule ne sont pas recalculées pendant la substitution (limite connue).

## Preuves
- Tests : ok (13 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"count":13,"scope":"related"},"tsc":{"ok":true}} -->
