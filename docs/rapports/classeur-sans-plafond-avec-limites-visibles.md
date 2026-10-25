# Rapport : Classeur sans plafond, avec limites visibles
Statut : termine
Visible : oui

## Fait
- Plus de plafond de lignes : `engine/rows.ts` (`lastUsedRow`, `rowsNeeded`, `ROW_STEP` = 1000). La feuille garde un bloc libre après sa dernière ligne utilisée et grandit quand on écrit près de la fin; `appGrid.ts` (`growRows` dans `touch`, `buildGrid` via `rowsNeeded`).
- Avant : `MAX_ROWS` (1000) figeait la feuille (A1500 hors bornes, impossible à atteindre); `ui/limits.ts` annonçait « non affichée » à tort. Ces avertissements sont retirés.
- Indicateur de poids: `engine/weight.ts` (`sheetWeight`, `formatBytes`, niveaux léger / lourd / très lourd), `ui/statusbar/weightBadge.ts` affiché à gauche de la barre d'état, toujours visible, mis à jour par `touch` et `buildGrid`.
- `ui/statusbar/statusbar.ts`: la barre n'est plus masquée; les statistiques n'apparaissent qu'à 2 cellules et plus.
- Docs: `docs/plafonds.md`, `CLAUDE.md` (Decisions classeur sans plafond), `TODO.md`.

## Non fait
- Capture du niveau « lourd » / « très lourd »: exige 200 000 cellules en e2e; couvert par tests unitaires (`engine/weight.test.ts`, `ui/statusbar/weightBadge.test.ts`).
- Pas de croissance au défilement: la feuille grandit à l'écriture, pas en naviguant vers des lignes vides (réserve d'un bloc).
- Indicateur de performance = niveau de poids seulement (pas de mesure du temps de recalcul).

## Preuves
- Tests : ok (2307 tests passés, 4 ignorés; `npm test` vert; `npx tsc --noEmit` vert)
- E2E : `e2e/feat-classeur-poids.spec.ts` (2), `e2e/feat-selstats.spec.ts`, `e2e/edit-virtual.spec.ts`, `e2e/feat-texte-colonnes.spec.ts` : 14 passés
- Captures : docs/screenshots/classeur-sans-plafond-avec-limites-visibles/poids-initial-clair.png, docs/screenshots/classeur-sans-plafond-avec-limites-visibles/poids-initial-sombre.png, docs/screenshots/classeur-sans-plafond-avec-limites-visibles/ligne-1500-clair.png, docs/screenshots/classeur-sans-plafond-avec-limites-visibles/ligne-1500-sombre.png
- Captures régénérées par les e2e (barre d'état désormais toujours visible): docs/screenshots/statistiques-de-selection-dans-la-barre-d-etat/, docs/screenshots/plafonds-google-sheets/, docs/screenshots/texte-en-colonnes/

## Decisions
- Seuils de poids: léger < 200 000 cellules non vides (= `IMPORT_WARN_CELLS`), lourd au-delà, très lourd au-delà de 1 000 000 cellules ou 10 M de caractères. Validés par le sous-agent `trancheur` (non mesurés par benchmark).
- Croissance par blocs de 1000 lignes, réserve d'un bloc: évite une grille de 1 000 000 lignes (hauteur de DOM et coût des filtres).
- Le poids est calculé à `touch` et `buildGrid`, pas à chaque sélection (O(cellules)).
- Design `docs/design/2026-10-25-180012.html` présent mais traite d'espion/validation/plages tronquées, sans lien avec cette carte: non suivi; la carte repose sur son texte et le code existant.
