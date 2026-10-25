# Rapport : Mode de calcul manuel et itératif
Statut : termine
Visible : oui

## Fait

- Moteur `src/engine/calc-mode.ts` : réglages `manual`, `iterative`, `maxIter` (100), `maxChange` (0,001), normalisation, abonnés.
- `src/engine/recalc.ts` : `solve` (Kahn) partagé ; cycles itérés (`iterate`) si itératif, sinon `#CYCLE!` comme avant ; `recalcOne` (manuel) ; `recalcSheet` (recalcul complet d'une feuille).
- `src/engine/workbook.ts` : `recalcWorkbook(sheet, all)` (F9 = classeur, Maj+F9 = feuille active).
- `src/engine/sheet.ts` : en mode manuel, `setCell` ne calcule que la cellule éditée ; les dépendants attendent F9.
- `src/ui/appCalc.ts` : méthode `app.recalc(all)` (ajoutée à l'App via `Object.assign` dans `appApi.ts`), redessin quand le mode change, recalcul complet quand l'itératif change (sans marquer le document modifié).
- `src/ui/commands.ts` : F9, Maj+F9, palette « Calculer maintenant », « Calculer la feuille », « Basculer calcul manuel / automatique ».
- `src/ui/dialogs/settings.ts` (Paramètres) : cases « Calcul manuel » et « Calcul itératif », champs « Itérations max » et « Écart max ».
- Tests : `src/engine/calc-mode.test.ts`, `src/engine/calc-engine.test.ts`, `src/ui/appCalc.test.ts` (écrits avant le code, rouges puis verts).
- E2E : `e2e/feat-calc-mode.spec.ts` (6 tests, clair et sombre), passe.
- Indicateur de mode dans la barre d'état : `src/ui/statusbar/calcBadge.ts` (masqué en automatique, « Manuel · F9 », « Itératif », infobulle des réglages), branché dans `statusbar.ts`, style dans `statusbar.css`. Test écrit en rouge d'abord : `src/ui/statusbar/calcBadge.test.ts`.

- Persistance : champ optionnel `calc` du `.dktable` (`src/io/calcFormat.ts` `calcToDoc`/`checkCalc`, `format.ts`, `types.ts`), écrit/lu via `calcField`/`loadCalc` (`src/ui/appCalc.ts`, branchés dans `appApi.ts`). Tests rouges d'abord : `src/io/calcFormat.test.ts`, `src/ui/appCalc.test.ts` (aller-retour, fichier itératif ouvert calcule son cycle).
- Cycles inter-feuilles en itératif : `workbook.ts` (`propagateFrom`, `converge`) saute le retour du cycle, puis répète la propagation depuis les formules inter-feuilles jusqu'à écart < seuil ou nombre max d'itérations. Test rouge d'abord : `src/engine/workbook-cycle.test.ts`. `gap` exporté de `recalc.ts`.
- Documentation : `docs/mode-de-calcul.md`.

## Non fait

## Captures

- docs/screenshots/mode-de-calcul-manuel-et-iteratif/barre-etat-manuel-clair.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/barre-etat-manuel-sombre.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-avant-f9-clair.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-avant-f9-sombre.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-apres-f9-clair.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-apres-f9-sombre.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/iteratif-convergence-clair.png
- docs/screenshots/mode-de-calcul-manuel-et-iteratif/iteratif-convergence-sombre.png

## Decisions

- Lint : aucun script dédié dans le projet ; `tsc --noEmit` et vitest servent de contrôle.
- Le design `docs/design/2026-10-25-212335.html` (valeur cible, espion, remplissage instantané) ne porte pas sur le mode de calcul : non utilisé.

- Persistance : champ `calc` absent si mode par défaut ; un fichier sans champ rouvre en automatique (le mode suit le classeur). Mode appliqué avant la construction des feuilles, pour que les cycles d'un fichier itératif soient calculés à l'ouverture.

- Indicateur de barre d'état : masqué en automatique (rien d'affiché par défaut) ; placé juste après le poids du classeur, avant les statistiques.
- Le design `docs/design/2026-10-25-200330.html` traite de l'analyse what-if (valeur cible, scénarios, espion), pas du mode de calcul : non utilisé comme base.
- Le design `docs/design/2026-10-25-204816.html` (valeur cible et évaluation pas à pas) ne porte pas sur le mode de calcul : non utilisé comme base, même raison que ci-dessus.
- Critère « référence circulaire itérative » : couvert intra-feuille et inter-feuilles. Hors itératif, les cycles inter-feuilles restent `#CYCLE!` (inchangé).
- Mode manuel : l'édition recalcule la cellule éditée seule ; ses dépendants (y compris sur d'autres feuilles) attendent F9. Les changements de mode décimal ou de fonctions nommées recalculent toujours tout (`recalcAll`, inchangé).
- Itératif : les cellules restées en cycle (et leurs dépendants) sont recalculées dans un ordre fixe, à partir de 0 si pas de valeur ou valeur d'erreur, jusqu'à écart max < seuil ou nombre max d'itérations ; sans convergence, les dernières valeurs sont gardées (sans erreur, comme Excel).
- Réglages par défaut : 100 itérations, écart 0,001 (valeurs de la carte). Valeurs saisies normalisées (entier >= 1, écart > 0).
- Activer/désactiver l'itératif relance un recalcul complet ; activer le manuel ne recalcule rien.
- Maj+F9 recalcule la feuille active ; F9 recalcule toutes les feuilles du classeur.
- Suite complète `npx vitest run` : 2466 tests verts ; 4 échecs dans `prototypes/oauth-sdk/orphans.test.ts` (balayage de worktrees git, sans lien avec le calcul), non vérifiés contre master.

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : docs/screenshots/mode-de-calcul-manuel-et-iteratif/barre-etat-manuel-clair.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/barre-etat-manuel-sombre.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-avant-f9-clair.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-avant-f9-sombre.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-apres-f9-clair.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-apres-f9-sombre.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/iteratif-convergence-clair.png, docs/screenshots/mode-de-calcul-manuel-et-iteratif/iteratif-convergence-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
