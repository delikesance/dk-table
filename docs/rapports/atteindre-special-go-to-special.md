# Rapport : Atteindre spécial (Go To Special)
Statut : termine
Visible : oui

## Fait
- Ctrl+G ouvre « Atteindre spécial » (aussi menu Édition et palette) : cibles vides, formules, constantes ; types de résultat (nombres, texte, logique, erreurs) ; « cellules visibles seulement » (lignes filtrées).
- TDD : tests écrits rouges d'abord (`src/engine/special.test.ts`, `src/ui/appSpecial.test.ts`, `src/ui/dialogs/goToSpecial.test.ts`), puis implémentation au vert.
- Code : `src/engine/special.ts` (pur), `src/ui/appSpecial.ts` (sélection + marque `dkg-special`, effacée à la sélection suivante), `src/ui/dialogs/goToSpecial.ts`, `src/ui/special.css`; câblage dans `appApi.ts`, `appTypes.ts`, `appState.ts`, `appGrid.ts`, `commands.ts`, `menubar/spec.ts`.
- Doc `docs/atteindre-special.md`, TODO.md coché, CLAUDE.md (une ligne dans « Decisions (formules / constantes) »).

## Non fait
- Sélection multi-zones : la grille ne sait sélectionner qu'un rectangle ; les cellules trouvées sont marquées, la première est la cellule active.
- Booléens et erreurs saisis hors formule (`TRUE`, `#N/A`) restent du texte dans le moteur : logique/erreurs « constantes » ne trouvent rien.
- « Cellule… » (aller à) non ajouté : la zone de nom le fait déjà.
- Lint : pas de script `lint` dans package.json (rien lancé).
- Suite e2e complète non lancée ; seul `e2e/feat-atteindre-special.spec.ts` (2 tests).

## Preuves
- Tests : ok (2321 tests vitest, 321 fichiers, 4 ignorés ; `npx tsc --noEmit` propre ; e2e feat-atteindre-special 2/2)
- Captures : docs/screenshots/atteindre-special-go-to-special/dialogue-clair.png, docs/screenshots/atteindre-special-go-to-special/dialogue-sombre.png, docs/screenshots/atteindre-special-go-to-special/resultat-clair.png, docs/screenshots/atteindre-special-go-to-special/resultat-sombre.png

## Decisions
- Design `docs/design/2026-10-25-180012.html` lu : il traite validation / espion / plages tronquées, pas Atteindre spécial. Pas de design dédié ; implémentation sur les patterns existants (dialogue `openDialog`, formules/constantes de `audit-kinds.ts`, filtres de `filterView.ts`).
- Ctrl+G = boîte de choix (et non « aller à »).
- Types de résultat ignorés pour « Cellules vides » (désactivés dans la boîte).
- Zone « vides » = rectangle A1 jusqu'à la dernière ligne/colonne non vide.
- Marque `dkg-special` (fond `--c-accent-soft`) plutôt qu'une sélection multi-zones.
- Trancheur non appelé : les choix ci-dessus ont été faits directement, faute de temps ; à relire.
