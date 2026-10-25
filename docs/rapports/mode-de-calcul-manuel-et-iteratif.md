# Rapport : Mode de calcul manuel et itératif
Statut : en-cours
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

## Non fait

- Persistance du mode dans le `.dktable` (le mode repart en automatique à l'ouverture).
- Références circulaires inter-feuilles : restent `#CYCLE!` même en mode itératif (`workbook.ts`).
- Lint : aucun script dédié dans le projet, seuls `tsc --noEmit` et vitest ont été lancés.

## Captures

Barre d'état en mode manuel, clair (indicateur « Manuel · F9 » à droite) :
![Barre d'état, mode manuel, clair](docs/screenshots/mode-de-calcul-manuel-et-iteratif/barre-etat-manuel-clair.png)

Barre d'état en mode manuel, sombre :
![Barre d'état, mode manuel, sombre](docs/screenshots/mode-de-calcul-manuel-et-iteratif/barre-etat-manuel-sombre.png)

Mode manuel, clair (A1 modifiée à 5, B1 reste à 2 avant F9) :
![Manuel, avant F9, clair](docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-avant-f9-clair.png)

Mode manuel, sombre, avant F9 :
![Manuel, avant F9, sombre](docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-avant-f9-sombre.png)

Après F9 (clair) :
![Manuel, après F9, clair](docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-apres-f9-clair.png)

Après F9 (sombre) :
![Manuel, après F9, sombre](docs/screenshots/mode-de-calcul-manuel-et-iteratif/manuel-apres-f9-sombre.png)

Itératif, convergence (clair) :
![Itératif, convergence, clair](docs/screenshots/mode-de-calcul-manuel-et-iteratif/iteratif-convergence-clair.png)

Itératif, convergence (sombre) :
![Itératif, convergence, sombre](docs/screenshots/mode-de-calcul-manuel-et-iteratif/iteratif-convergence-sombre.png)

## Decisions

- Indicateur de barre d'état : masqué en automatique (rien d'affiché par défaut) ; placé juste après le poids du classeur, avant les statistiques.
- Le design `docs/design/2026-10-25-200330.html` traite de l'analyse what-if (valeur cible, scénarios, espion), pas du mode de calcul : non utilisé comme base.
- Mode manuel : l'édition recalcule la cellule éditée seule ; ses dépendants (y compris sur d'autres feuilles) attendent F9. Les changements de mode décimal ou de fonctions nommées recalculent toujours tout (`recalcAll`, inchangé).
- Itératif : les cellules restées en cycle (et leurs dépendants) sont recalculées dans un ordre fixe, à partir de 0 si pas de valeur ou valeur d'erreur, jusqu'à écart max < seuil ou nombre max d'itérations ; sans convergence, les dernières valeurs sont gardées (sans erreur, comme Excel).
- Réglages par défaut : 100 itérations, écart 0,001 (valeurs de la carte). Valeurs saisies normalisées (entier >= 1, écart > 0).
- Activer/désactiver l'itératif relance un recalcul complet ; activer le manuel ne recalcule rien.
- Maj+F9 recalcule la feuille active ; F9 recalcule toutes les feuilles du classeur.
- Suite complète `npx vitest run` : 2466 tests verts ; 4 échecs dans `prototypes/oauth-sdk/orphans.test.ts` (balayage de worktrees git, sans lien avec le calcul), non vérifiés contre master.

## Preuves
- Tests : ok (228 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"count":228,"scope":"related"},"tsc":{"ok":true}} -->
