# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development methodology: TDD

- The project follows test-driven development: write tests first (red), implement (green), then refactor.
- No feature or fix is implemented before a failing test exists for it.
- Every worker brief must include the test command and the test to write first.
- CI (`.github/workflows/ci.yml`) runs tests on every push/PR and must stay green.
- Dev environment is containerized (`Dockerfile` + `docker-compose.yml`, service `dev`).

## Rules

- No file may exceed 200 lines (code, CSS, docs, tests); split into modules before crossing it.
- Everything is documented: every module/function/component gets a short doc comment, and each implementation is documented (what/why, usage) in the same change.
- After every implementation, update `CLAUDE.md` when needed (commands, architecture, structure, decisions) and update `TODO.md` (see To-do list).

## Parallel workflow

- Before launching a task, split it into small independent mini-tasks (disjoint files where possible).
- One worker per mini-task, each in its own git worktree on branch `wt/<mini-task-name>`, run in parallel.
- TDD per mini-task: write its failing test first; every worker brief includes the test command (`npm test`, plus `cargo test` for Rust).
- Workers commit small, on their own branch; nothing left uncommitted in a worktree.
- Merge all `wt/*` into a single branch `integration`, resolve conflicts there, run full `npm test` + `npx tsc --noEmit` (+ `cargo test` if Rust touched).
- Merge `integration` into main (`master` here) only when green.
- `TODO.md` is updated in the same change as the work (per mini-task, reconciled at integration).
- Delete merged worktrees/branches afterwards.

## To-do list

- `TODO.md` (repo root) is the source of truth for tasks.
- It MUST be updated on every task change (added, started, done, blocked, reprioritized), in the same change/commit as the work.

## Dev environment

- `Dockerfile`: node:22-bookworm + Rust + Tauri v2 Linux deps. `docker-compose.yml`: service `dev`. `.dockerignore` present.
- Docker Desktop 4.96.3 installed (WSL2 backend), daemon OK. `docker` is not on the PATH of existing shells: use `C:\Program Files\Docker\Docker\resources\bin` or open a new terminal.
- `docker compose build` (service `dev`) validated: image `dk-table-dev` builds. CI not yet validated on GitHub.

## CI

- `.github/workflows/ci.yml` (GitHub Actions, on push + PR): `npm ci`, `npm test`, `cargo test`, each guarded by file existence.
- `.github/workflows/release.yml`: build Linux (deb + AppImage); à valider via workflow_dispatch. Tests de config: `src/config/packaging.test.ts`; tests de styles/contraste: `src/styles/styles.test.ts`.

## Commands

- Worktree + vitest: si `node_modules` est une jonction vers le dépôt principal, vitest échoue ("Denied ID" sur `node_modules/iconoir`): lancer `npm install` dans la worktree ou mettre `server.fs.strict=false`.
- `npm test` (vitest, jsdom pour l'UI), `npx tsc --noEmit`, `npm run build` (tsc + vite), `npm run tauri dev`.
- `cargo test` (in `src-tauri/`), `npm run tauri build` (MSI + NSIS in `src-tauri/target/release/bundle/`).
- `src/engine/` (pure logic, e.g. `sheet.ts` + tests), `src/ui/` (DOM), `src/main.ts` (entry), `src-tauri/` (Rust, `lib.rs` registers plugins dialog + fs).
- Window 1200x800 "dk-table", id `com.delikesance.dktable`; capabilities in `src-tauri/capabilities/default.json` (dialog open/save, fs read/write text file only).
- `src-tauri/icons/` = placeholder flat icon, to replace.

- `npm run test:e2e` (Playwright, Chrome headless, `e2e/`, hors vitest). Prérequis: `npx playwright install chromium` (ou `E2E_CHANNEL=chrome` pour le Chrome système). Lance son propre Vite sur un port aléatoire (`E2E_PORT` s'il est fixé), jamais réutilisé (`reuseExistingServer: false`); pas de Tauri (dialog/fs absents). Helpers: `e2e/helpers.ts` (cellules = `.dkg-cell[data-key="A1"]`).

## Structure (src/)

- `engine/`: modèle + recalcul (`sheet.ts` API publique: createSheet/setCell/getRaw/getValue/getDisplay/getRangeValues/registerFunction). `engine/live/`: mini-charts SVG purs + `adapter.ts` (registerLive: texte de repli dans le moteur; `liveResult(raw, range)`: `{kind:'html'}` pour la cellule).
- `io/`: format `.dktable` (`format.ts`), CSV (`csv.ts`), dialogues/fs Tauri (`files.ts`, deps injectables).
- `ui/`: `icons.ts` (Iconoir `iconoir/icons/regular/*.svg?raw`, `icon(name)`, `currentColor`, noir via `--c-icon`), `appTools.ts` (bouton `toggle-tools`, mode minimal, Ctrl+J, état persistant `dk-table.tools`), `app.ts` (mount, câblage), `appTypes.ts` (interface App), `appState.ts`, `appGrid.ts`, `appApi.ts`, `appWidgets.ts` (modules issus du split de app.ts), `model.ts` (feuilles, styles, undo/redo par snapshots), `cellview.ts` (styles + rendu live), `numfmt.ts` (formats de nombre), `commands.ts` (palette, raccourcis Ctrl+Z/Y/B/I/O/S/N, menu contextuel), `fileops.ts`, `fndocs.ts`; sous-dossiers `grid/ toolbar/ (dont `menus.ts`: menus Fichier + Import/Export) tabs/ sidebar/ palette/ contextmenu/`.
- `engine/cf/` + `ui/cf/` : formatage conditionnel (voir « Decisions (formatage conditionnel) »).
- Modules neufs (non câblés dans l'UI, voir TODO Phase 8): `engine/range.ts`, `engine/sort.ts`, `ui/sort.ts`, `io/autosave.ts`, `ui/grid/filter.ts`, `ui/toast/`, `ui/toolbar/colors.*`, `ui/toolbar/floating.*`.
- Fonctions: `engine/fn-{math,text,logic,date,finance,cond,lookup}.ts` enregistrées par `engine/wire.ts` (import côté `sheet.ts`, évite le cycle avec `functions.ts`) via `registerBuiltin(name, fn)` (args bruts) ou `registerFunction` (nombres). `listFunctionNames()` = liste réelle (registre + IF/IFERROR/IFNA + SPARKLINE/BAR/TREND), utilisée par `fndocs.test.ts`. Docs FR: `ui/fndocs.ts` + `fndocs-{math,text,more}.ts`.
- Grille virtualisée: `ui/grid/virtual.ts` + `window.ts`, MAX_ROWS=1000.
- Dates: convention 1900 unique (`numfmt.ts` = `fn-date.ts`): 1 = 01/01/1900, 60 = faux 29/02/1900, dès 61 = 1899-12-30 + n.
- Fonctions ajoutées (vague « fonctions manquantes »): `engine/fn-{math2,stats,cond2,text2,info,date2}.ts`, helpers `fn-args.ts`, IFS/SWITCH paresseux dans `engine/lazy.ts` (branché dans `evaluator.ts` comme IF/IFERROR); docs FR `ui/fndocs-{math2,text2}.ts`. Codes d'erreur: `#N/A`, `#NUM!` existent; les littéraux d'erreur (`=#REF!`, `#N/A`) sont lus par le parseur.
- Limites connues: ISBLANK vrai aussi pour ""; MEDIAN sans nombre -> #VALUE!; RAND/RANDBETWEEN non volatiles; CHOOSE ne renvoie pas de plage; une référence d'une seule cellule reste un scalaire (texte -> #VALUE! dans SUM).
- `ui/formula/`: autocomplétion des fonctions. `fnComplete.ts` (pur: `fnCompletion(text, pos, docs)` -> liste des noms qui commencent par le mot tapé après `=`, un opérateur, `(` ou `;`, ou aide de signature de l'appel ouvert avec l'argument courant; `applyFn` insère `NOM(`), `fnPopup.ts` (`attachFnComplete(champ)` à appeler AVANT le keydown du champ: flèches, Entrée/Tab insèrent, Échap ferme la liste seulement; aide de signature sans capture de touches), branché dans `grid/editor.ts` et `toolbar/formulabar.ts`. Source = `FN_DOCS`, ordre alphabétique (exact en premier), comme Excel.
- Outils comptables: `engine/fn-loan.ts` (IPMT, PPMT, PV, FV, RATE, NPER, CUMIPMT, CUMPRINC), `fn-invest.ts` (IRR avec estimation si 1er arg = plage, sinon tous les args sont des flux; MIRR, XNPV, XIRR), `solve.ts` (Newton puis bissection, partagé RATE/IRR/XIRR), `fn-amort.ts` (SLN, SYD, DB, DDB, VDB, AMORLINC, AMORDEGRC), `daycount.ts` (bases 0-4, DAYS360) + `fn-acct.ts` (MROUND, YEARFRAC, DAYS360), `fn-subtotal.ts` (SUBTOTAL, AGGREGATE; pas d'info de lignes masquées: 101-111 = 1-11, sous-totaux imbriqués non ignorés). Docs FR `ui/fndocs-{finance,acct}.ts`. Format `accounting` dans `ui/numfmt.ts`. FEC: `io/fec.ts` (`toFec`, validations), `docs/fec.md`.
- `macros/`: macros Lua sans DOM. `lua.ts` (`runMacro(code, host)`: fengari Lua 5.3, bac à sable, `print` capturé, limite d'instructions), `api.ts` (table `sheet` + interface `MacroHost`), `complete.ts` + `luadocs.ts` (autocomplétion indépendante de l'éditeur), `store.ts` (liste des macros). Référence utilisateur : `docs/macros.md`.
- `ui/macros/`: `wire.ts` (commandes palette + Alt+F11, chargement paresseux de `kit.ts`), `panel.ts` (panneau droit 440px), `editor.ts` (CodeMirror 6), `run.ts` (exécution sur la feuille active), `macros.css` (tokens `--c-code-*` avec repli).
- `styles/`: `tokens.css` (clair, refonte Hermes), `theme-dark.css` (`:root[data-theme="dark"]`, nuit Hermes), `chrome.css` (barres du haut en bleu : remap des tokens sur `--c-chrome-*`, popups repassés sur papier via `--paper-*`), `fonts.ts` (polices @fontsource locales), `components.css`. `ui/theme.ts` pose `data-theme` (préférence `dk-theme` : auto/light/dark).

## Decisions (refonte Apple)

- Mode minimal par défaut: seuls grille + barre de formule + onglets visibles; `.dk-app__tools` (toolbar) et `.dk-sidebar` sont `hidden` jusqu'au clic sur `[data-action="toggle-tools"]` (classe `dk-app--minimal`).
- Icônes: bibliothèque Iconoir (dépendance `iconoir`), toutes via `src/ui/icons.ts` (SVG inline `currentColor`); `--c-icon` noir (clair) / clair (sombre). `mockups/design/` resynchronisé.

## Decisions (accueil, menus, dialogues — refonte Hermes)

- `ui/onboarding/` (`showOnboarding(host, actions: HomeActions)`): accueil modal sur le bleu chrome (nuit en sombre) : nom, Nouveau classeur / Ouvrir / Importer CSV, récents (nom + chemin, section absente si vide), Atlas à droite (`ui/art.ts`, `src/assets/atlas-bleu.png` / `atlas-nuit.png`, version choisie par `data-theme`). Chaque choix ferme puis lance l'action, Échap ferme. Affiché par `main.ts` sauf `?onboarding=0` (e2e `openApp`) ou réglage « accueil au démarrage » décoché (`dk-table.home`).
- Barre de menus : `ui/menubar/spec.ts` (`buildMenuSpec(app, deps)`, 8 menus à un niveau, seul « Récents » se déplie, aucun libellé en double, actions réellement implémentées seulement), `ui/menubar/deps.ts` (branchement fileops/dialogues/palette/macros), rendu `createMenuBar` (`toolbar/menus.ts`, entrées `sep` et radio `checked`). Montée dans `.dk-app__menubar` (première ligne du chrome, toujours visible, même en mode minimal).
- Répartition sans doublon : barre de menus = catalogue complet ; barre d'outils = actions fréquentes (plus de Fichier ni Ouvrir/Enregistrer) ; palette Ctrl+K = recherche. Thème dans Affichage ; Paramètres (Fichier, Ctrl+,) = réglages persistants (accueil au démarrage). Alt+F11 = éditeur de macros.
- `ui/dialogs/` : `openDialog` (modale commune, une instance par id, Échap/voile/Fermer), `settings.ts`, `about.ts` (Atlas + crédits polices/icônes).
- Tokens `--ob-*` : alias des tokens sémantiques (fin de `styles/tokens.css`).

## Decisions (intégration I8)

- Ctrl+N / menu « Nouveau » = nouveau document vierge (confirmation si modifications non enregistrées via `fileops.newDocument`); « Nouvelle feuille » = palette.
- Apostrophe en préfixe (`'abc`): force le texte, comme Excel; l'apostrophe n'est pas affichée (voir `engine/recalc.ts`).
- Cellules vivantes: le moteur ne gère que des valeurs texte/nombre; `liveResult` détecte `=SPARKLINE|BAR|TREND(plage)` pleine cellule et la grille (hook `renderCell`) affiche le SVG. Le moteur renvoie un texte de repli (ex. TREND: "▲ +10%").
- Undo/redo: snapshot des cellules brutes par feuille (100 max); les éditions groupées (coller/effacer) = un pas. Les styles sont aussi annulables (un pas par `app.style`) et persistés dans `.dktable` (`DocSheet.styles`).
- Recalcul UI: `grid.refresh()` incrémental: parcourt les 2600 cellules (renderCell/getDisplay) mais n'écrit le DOM que si le contenu change.
- Fichiers récents: `io/recents.ts` (liste persistée dans localStorage, store injectable), câblé dans `appApi.ts`.
- Format de nombre: `ui/numfmt.ts` `formatValue` (fr-FR: number/percent/currency), format par cellule via `CellStyle.format`; "Date" non implémenté (sans effet).

## Decisions (fonctions tableur, vague 2)

- Références `$A$1`/`$A1`/`A$1`: le tokenizer retire le `$` (évaluation identique). `engine/refs.ts` `shiftFormula(raw, dCol, dRow)`: décalage à la recopie (parties `$` fixes, hors feuille -> `#REF!`, chaînes et noms de fonction intacts). Utilisé par Ctrl+D/R (`ui/grid/fill.ts`) et le copier-coller interne (`ui/grid/clipboard.ts`, `pasteMatrix`); couper-coller et texte externe collés tels quels.
- Insérer/supprimer lignes et colonnes: `engine/structure.ts` (déplace les cellules, réécrit les références; `$` bouge aussi; réf. supprimée -> `#REF!`; plages réduites/agrandies), `ui/appStructure.ts` `structOp` (styles, largeurs, filtres, un pas d'undo). Menu contextuel + palette + Ctrl+Maj+= / Ctrl+-, sur les lignes/colonnes de la sélection. Limite: les réf. inter-feuilles ne sont pas réécrites.
- Formats: `CellStyle.underline` (Ctrl+U), `wrap` (classe `dk-wrap`, hauteur de ligne fixe), `borders {t,r,b,l}` (`ui/borders.ts` modes Toutes/Contour/Bas/Aucune, `App.borders(mode)`, rendu `data-borders` + `::after` dans `ui/cellview.css`); menu « Bordures » = `ui/toolbar/bordersMenu.ts`. Persistés dans `.dktable`.
- Volets figés: `ui/grid/freeze.ts` (calculs) + `freezeView.ts` (sticky, variables `--dkg-t<r>`/`--dkg-l<c>` sur `.dkg`); `ui/grid/mark.ts` (surbrillance sortie de `grid.ts`). État par feuille `Entry.freeze`, sauvé en `DocSheet.freeze?: {rows, cols}`, non annulable; `App.setFreeze`; palette `view.freeze-*` / `view.unfreeze`, pas de bouton.
- Souris (façon Sheets): `ui/grid/mouse.ts` (clic/Maj+clic/glisser sur cellules et en-têtes, coin = tout; une sélection d'en-tête est une plage ordinaire `B1:B1000`, sans défilement). `grid.select("A1:B3")` place le curseur en haut à gauche. Clic droit sur en-tête = `ui/headerMenu.ts`; entrées « Figer jusqu'à » partagées `ui/freeze/freezeMenu.ts` (`App.getFreeze`). Poignées de gel: `ui/grid/freezeHandle.ts` (option grille `onFreeze`).
- Rendu de la sélection (`ui/grid/mark.ts` + `grid.css`): plage = teinte légère (`--c-accent-soft`) + contour accent 1,5px posé par les cellules de bord (`dkg-e-t/b/l/r`, variables `--e-*`), curseur = anneau plein 2px + cran carré 6px, en-têtes de la plage teintés avec arête accent côté grille (`dkg-on`), ceux du curseur plus appuyés (`dkg-on-active`). La barre flottante passe sous la plage si elle recouvrirait les en-têtes de colonnes (`placeFloating(..., minTop)`).
- Clavier: `ui/grid/nav.ts` (calculs: Ctrl+flèches = bords de blocs comme Excel, Début, Ctrl+Début/Fin, PgPréc/PgSuiv, Ctrl+A = plage utilisée, Ctrl+Espace / Maj+Espace), `ui/grid/refcycle.ts` (F4 dans l'éditeur et la barre de formule), option grille `onSheetStep` (Ctrl+PgPréc/PgSuiv via `appGrid.stepSheet`). L'éditeur de cellule est un `<textarea class="dkg-editor">` (Alt+Entrée = saut de ligne, `.dkg-ml` = pre-wrap, hauteur fixe); Ctrl+Entrée remplit la sélection en un pas d'undo avec décalage des références depuis la cellule active.
- Références inter-feuilles: `Feuille2!A1`, `'Feuille 1'!A1:B3` (`''` échappe; noms avec espace à citer). Nœuds `xref`/`xrange`, `engine/book.ts` (registre nom -> feuille), `engine/state.ts` (état dérivé + `xprec`), `engine/workbook.ts` (`bindWorkbook`, `recalcBook`: propagation DFS entre feuilles, cycle -> #CYCLE!). UI: `relink(c)` (appState) après mount/ajout/import/chargement/undo/redo/renommage/suppression. Limite: renommer/supprimer une feuille ne réécrit pas les formules (-> #REF!).

## Decisions (formatage conditionnel)

- Modèle `engine/cf/types.ts` (`CfRule` = `{id, range}` + type, inspiré de `CfRule` d'IronCalc), évaluation pure `engine/cf/compute.ts` (`computeCf(rules, env)` -> `Map<clé, CfStyle>`; `env.ts` = `sheetEnv(sheet)`), prédicats `match.ts`, échelles/barres `scale.ts`, insert/suppr. lignes-colonnes `structure.ts` (`shiftRules`).
- Priorité = ordre de la liste : la première règle gagne sur chaque propriété (remplissage, couleur, gras, italique, barre), les suivantes complètent. Pas d'« arrêt si vrai ». Cellules vides : jamais concernées par les règles de valeur (contrairement à Excel qui les lit comme 0).
- Règle « formule » écrite pour la cellule en haut à gauche de la plage, décalée pour les autres (`shiftFormula`, `$` fixes). Opérandes `=formule` évalués une fois (non décalés). Échelle à 3 couleurs : milieu = médiane. Barres : de min(0, valeurs) à max(0, valeurs).
- État : `Entry.cf` (dans les snapshots d'undo), sauvé en `DocSheet.cf` (absent si vide, validé par `io/cfFormat.ts`; `DktParseError` déplacé dans `io/parseError.ts`). `Ctx.cfMap` = styles calculés de la feuille active, recalculés par `appGrid.refreshCf` (à chaque `touch`, construction de grille, `setCfRules`); seules les cellules affichées concernées sont repeintes. `App.cfRules()` / `App.setCfRules(rules)` (un pas d'undo).
- Rendu `cellview.paintCell(el, style, cf)` : le style conditionnel recouvre le style de la cellule sans le modifier (`activeStyle` inchangé). Un remplissage sans couleur de texte reçoit une encre contrastée (bleu #0000F2 sur clair, papier #F2F2F2 sur foncé, `isDark`) dans les deux thèmes.
- UI `ui/cf/` : `panel.ts` (`openCfDialog`, liste par priorité, aperçu, Monter/Descendre/Modifier/Supprimer, chaque action appliquée tout de suite), `form.ts` (éditeur, champs selon le type, palette `FILL_COLORS`/`TEXT_COLORS`), `describe.ts` (libellés FR). Accès : Format > Formatage conditionnel… + palette `format.cf`; pas de bouton de barre d'outils (fréquence faible).

## Docs

- `docs/demo.md`: script de la démo de 5 minutes (installation puis tour des fonctions).
- `docs/workflow-ux.md`: workflow UX casual-first (niveaux N1/N2/N3, coût en clics); maquette `mockups/workflow-ux.html` (4 écrans commutables, exemptée de la limite de 200 lignes).

## Decisions (macros Lua)

- VM Lua = fengari (Lua 5.3 en JS pur, synchrone, testable sous vitest). `tmp`/`readline-sync` (Node) remplacés par un stub dans `vite.config.ts`.
- Éditeur = CodeMirror 6 (mode Lua legacy). Lua VM + éditeur chargés à la demande (`import("./kit")`) : chunk de démarrage ~46 Ko, chunk macros ~555 Ko.
- Dev server (`vite`/`tauri dev`): le client Vite définit un faux `globalThis.process = {env:{}}` qui envoie fengari dans ses branches Node. `src/macros/envHide.ts` (avant fengari) le masque, `envRestore.ts` (après) le remet ; `process.env.FENGARICONF` est figé via `define` + `optimizeDeps.rolldownOptions.transform.define` dans `vite.config.ts`. Couvert par `e2e/feat-macros.spec.ts` (menu Scripts > Éditeur de macros, Alt+F11).
- API Lua alignée sur les noms du moteur (`sheet.getValue`, `setCell`...), validée avec le fil design.
- Accès : palette Ctrl+K (« Éditeur de macros », « Macro : nom ») + Alt+F11. Pas de bouton toolbar : le menu « Scripts » de la refonte design listera les macros (`app.macros`, `app.runMacro`, `app.openMacros`).
- Remplace l'implémentation wasmoon (boîte textarea) arrivée en parallèle sur master : même besoin, éditeur et persistance en plus.
- Une exécution = un pas d'annulation (`app.batch`), aucun pas si rien n'a changé. Macros persistées dans `.dktable` (`macros?: {id,name,code}[]`, format v1 rétrocompatible).

## Research

- `docs/recherche-tableur.md`: synthesis of spreadsheet features (with priorities) and UX click-reduction rules.
- Source gaps noted there: no LibreOffice / Apple HIG / Material source; some items marked "[Pratique]" or unsourced.

## Design

- Reference design (v2, validée le 2026-10-24) = refonte « Hermes » (direction de hermes-agent.nousresearch.com), canvas https://claude.ai/artifact/V1WWvok6xhPzTSruqxpWVk (écran principal, système, accueil Atlas, éditeur de macros, barre de menus, variantes). Code de référence : `src/styles/`.
- Palette : bleu #0000F2 + papier #F2F2F2 (grille #FAFAFA, encre bleue) ; sombre = nuit #19192F, texte #F2F2F2, fonds pleins #0000F2, anneaux #8C8CFF. Orange seulement pour baisse/erreur. Rayons 2-4px, pas d'ombre hors surfaces flottantes.
- Polices locales (@fontsource, sous-ensemble latin) : Inter Tight (texte), DM Mono (données, formules, en-têtes), Sofia Sans Extra Condensed (menus, onglets, titres, en capitales).
- Règles produit (ANGELO) : outil pro, aucun texte décoratif ni astuce ; pas de bouton en double ; accès selon la fréquence (grille > barre d'outils > barre de menus à un niveau > palette Ctrl K). SPARKLINE/BAR/TREND sont des fonctions, pas des boutons.
- Illustration : gravure de l'Atlas Farnèse (Brendamour, domaine public) en bichromie, uniquement hors écran de travail (accueil, splash, À propos, installeur).
- `mockups/design/` = design v1 Apple-like, obsolète (conservé pour l'historique).
- The 3 pépite mockups live in `mockups/` (`pepite-1-fleches.html` 325 lines, `pepite-2-voyage-temps.html` 341, `pepite-3-cellules-vivantes.html` 191).
- Exemption to the 200-line rule: mockups only (pepite-1 and pepite-2 exceed 200, not split). App code stays ≤200.

## Status

**Project**: dk-table = entry for hackathon "War of Code : le Tableur" (build an Excel-like spreadsheet by midnight; AI may write the code but the app must NOT embed AI; auto-recalc of dependents mandatory; installable on Windows + Linux; scored by peers /10 on beauty, practicality, lightness, ease of use; +5 "Pépite" bonus for an original feature; 5-min demo: install then feature tour).

**Decisions (user-confirmed)**: stack = Tauri/Rust + web front; time budget = until midnight (not 4h); chosen Pépite direction = "Cellules vivantes".

**Pépites brainstormed** (HTML mockups in `mockups/`; none browser-tested):
1. Flèches de dépendances vivantes: animated SVG arrows between precedents (blue) and dependents (orange) on hover, animated recalc propagation. Not chosen / set aside (to confirm if kept as secondary). Mockup: `mockups/pepite-1-fleches.html`
2. Voyage dans le temps: change journal + timeline slider + compare two states. Not chosen / set aside (only if time remains; to confirm). Mockup: `mockups/pepite-2-voyage-temps.html`
3. **Cellules vivantes (CHOSEN)**: in-cell mini-charts via SPARKLINE(range), BAR(range), TREND(range) (curve, mini-bars, colored arrow + %); redraw on edit. Mockup: `mockups/pepite-3-cellules-vivantes.html`

**Open / to confirm**:
- Spreadsheet feature scope (formulas, functions list, undo/redo, CSV import/export, formats)
- Cycle handling (#CYCLE)
- Linux packaging format
- Whether pépites 1/2 are dropped or kept as stretch
