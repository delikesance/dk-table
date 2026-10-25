# Rapport : Validation à l'épreuve du collage
Statut : termine
Visible : oui

## Fait
- Moteur pur `src/engine/validation/` (`checkValue`, `invalidCells`) : entier, décimal, liste, longueur.
- Règles par feuille, persistées (`DocSheet.validation`, `io/validationFormat.ts`) et annulables.
- Contrôle au collage, au remplissage (Ctrl+D/R, poignée) et à l'ouverture/import (hook grille `onBulk`, `ui/appValidation.ts`) : cellules marquées (`data-inv`) + toast « N cellules invalides » / « Voir ».
- Panneau « Validation des données… » (menu Données, palette) : règles, liste des cellules invalides, « Corriger » / « Tout corriger » (`ui/validation/`).
- Docs : `docs/validation.md`, `CLAUDE.md`, `TODO.md` coché.

## Non fait
- Refus à la saisie (les valeurs invalides sont acceptées puis signalées).
- Règles par formule personnalisée, liste issue d'une plage, messages d'erreur personnalisés.

## Preuves
- Tests : ok (2269 tests)
- Captures : docs/screenshots/validation-a-l-epreuve-du-collage/collage-signale-clair.png, docs/screenshots/validation-a-l-epreuve-du-collage/collage-signale-sombre.png, docs/screenshots/validation-a-l-epreuve-du-collage/panneau-clair.png, docs/screenshots/validation-a-l-epreuve-du-collage/panneau-sombre.png

## Decisions
- Périmètre : signaler puis corriger (pas de blocage), pour que collage, remplissage et import ne contournent jamais la règle.
- « Corriger » vide la cellule (annulable en un pas) ; pas de valeur de repli devinée.
- Cellule vide toujours valide ; formule ignorée pour les types nombre.
- Import CSV crée une feuille sans règle ; les règles d'un fichier ouvert sont contrôlées à l'ouverture.
- Tests : unitaires (moteur, format, app, panneau) + e2e `e2e/feat-validation.spec.ts` (tsc OK).
