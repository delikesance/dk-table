# TODO

Source de vérité des tâches (voir CLAUDE.md). À mettre à jour à chaque changement de tâche.

## Phase 0 : Préparation

- [x] T0.1 Vérifier prérequis : node v24.22.1, npm 11.19.1, rustc 1.99.0, cargo 1.99.0, WebView2 155.0.4283.62
- [x] T0.2 Maquettes copiées dans `mockups/`, chemins de CLAUDE.md corrigés (exemption 200 lignes pour pepite-1/2, maquettes uniquement)
- [x] T0.3 Docker Desktop 4.96.3 installé; `docker compose build` (service dev) OK (CI non validée)
- [x] T0.4 Commiter et pousser les fichiers non commités (Dockerfile, docker-compose.yml, .dockerignore, ci.yml, CLAUDE.md, docs/recherche-tableur.md, TODO.md)
- [ ] T0.5 Vérifier la CI sur GitHub (run 97dfa55 OK ; run 40112430388 à contrôler, voir P0) (CI epingle sur ubuntu-24.04: ubuntu-latest=26.04 bloquait sur apt)

## Phase 1 : Squelette Tauri (après T0.1)

Chaque tâche : écrire le test d'abord (TDD).

- [x] T1.1–T1.7 Tauri v2 + Vite TS, structure `src/`/`src-tauri/`, fenêtre 1200x800, plugins dialog + fs (permissions minimales), `tauri dev` et premier `tauri build` (MSI + NSIS) OK

## Phase 2 : Tableur de base (après T1.2)

- [x] T2.1 Modèle Sheet (map clairsemée "A1" -> valeur, conversions colonnes) (parallèle avec T2.2)
- [x] T2.2 Grille 26x100 (non virtualisée, voir P2) (parallèle avec T2.1)
- [x] T2.3 Sélection clavier/souris (après T2.2)
- [x] T2.4 Édition + barre de formule (après T2.3)
- [x] T2.5 Lier grille et modèle (après T2.1 et T2.4)

## Phase 3 : Documents (après T2.5)

- [x] T3.1 Format JSON `.dktable` `{version:1,active,sheets:[{id,name,cols,rows,cells,styles?}]}`
- [x] T3.2 Nouveau document
- [x] T3.3 Ouvrir
- [x] T3.4 Enregistrer / enregistrer sous
- [x] T3.5 Raccourcis Ctrl+N/O/S et titre avec indicateur de modification

## Phase 4 : Inspiration

- [x] T4.2 Relire `docs/recherche-tableur.md` pour prioriser les features

## Phase 5 : Vérification

(T5.1 et T5.2 : voir Phase 7)

## Phase 6 : Implémentation (après squelette T1.x)

Chaque tâche : test d'abord (TDD). Le squelette (T1.x) passe en premier ; ensuite les tâches I1 à I7 sont parallélisables (fichiers disjoints, worktrees séparés).

- [x] I1 Modèle Sheet + tests (`createSheet()` smoke fait) (`src/engine`) (parallèle)
- [x] I2 Grille UI (`src/ui/grid`) (parallèle)
- [x] I3 Barre d'outils + barre de formule (parallèle)
- [x] I4 Sidebar + onglets de feuilles (parallèle)
- [x] I5 Palette de commandes (Ctrl+K) + menu contextuel (parallèle)
- [x] I6 Cellules vivantes SPARKLINE/BAR/TREND : moteur + rendu (parallèle)
- [x] I7 E/S fichier document `.dktable` JSON (parallèle)
- [x] I8 Intégration et branchement des modules (après I1 à I7)

## Phase 7 : Lacunes connues et suites (par priorité, échéance minuit)

P0 : bloquant démo
- [ ] T5.1 Vérification visuelle réelle dans la fenêtre Tauri (`npm run tauri dev`) : créer, remplir, enregistrer, rouvrir, CSV, menu contextuel, Ctrl+K, copier-coller de plages (un seul pas d'annulation) ; corriger les bugs UI
- [ ] Vérifier la CI : `gh run view 40112430388` (doit rester verte)
- [ ] demo-5min : doc écrit (`docs/demo.md`, test `src/config/demo.test.ts`) ; reste la répétition à la main (checklist en fin de doc)
- [x] Persister gras/italique/alignement/fond dans `.dktable` + annulation (style-persist-undo)
- [x] refonte-apple : mode minimal par défaut (feuille + barre de formule), bouton chevron `toggle-tools` déploie toolbar + sidebar, icônes Iconoir noires partout (`src/ui/icons.ts`, `--c-icon`; onglets, sidebar, menu contextuel, `composants.html`), menus Fichier + Import/Export dans la toolbar (`toolbar/menus.ts`), déploiement des outils : Ctrl+J + commande palette + état persistant `dk-table.tools`. Reste à la main : vérification visuelle (clair/sombre) dans Tauri
- [x] menu-format-nombre : format de nombre par cellule (général/nombre/pourcentage/devise) via `app.style({format})` ; limite connue : l option "Date" du menu est sans effet
- [x] formats-de-nombre-personnalises : Format > Personnalisé… (1 à 4 sections, texte entre guillemets, `0.0" cm"`), `src/ui/numfmtCustom.ts`, dialogue `ui/dialogs/customFormat.ts`, `docs/formats-personnalises.md`, rapport `docs/rapports/formats-de-nombre-personnalises.md`
- [x] workflow-ux : doc `docs/workflow-ux.md` écrit (benchmark, N1/N2/N3, clics, 12 changements, décisions) + `src/config/workflowUx.test.ts`
- [ ] workflow-ux : planifier les changements du doc §4 (barre N1 visible, Σ, tri, menu Fichier unique, toast, couleurs, filtre, redim., autosave, Ctrl+D/R, mini-barre, format Date) ; trancher les décisions §5

P1 : qualité visible (beauté, praticité)
- [x] Corriger les alertes hooks design (contraste, taille min) : fait (contraste-design, `src/styles/styles.test.ts`)
- [ ] Icône d'application définitive (placeholder aujourd'hui)
- [x] Formule vivante : tests de verrouillage seulement (`live.test.ts`) ; SVG en formule composée non supporté par le moteur texte/nombre (reste cellule entière)
- [x] Fichiers récents persistés (`src/io/recents.ts`, localStorage) ; scope fs Tauri : fait (`capabilities/default.json` autorise $HOME/$DOCUMENT/$DESKTOP/$DOWNLOAD en lecture/écriture texte + plugin persisted-scope pour les chemins choisis ailleurs, test `src/config/fsScope.test.ts`)

P2 : perf et fonctions
- [x] Perf grille : rendu incrémental (écritures DOM évitées si inchangé) ; limite : renderCell/getDisplay toujours appelés pour 2600 cellules
- [x] Perf grille : virtualisation (`perf-grid-virtual`, MAX_ROWS=1000) ; reste : rendu à vérifier à la main
- [x] Fonctions : fn-math/text/logic/date/finance/cond/iferror câblées (`engine/wire.ts`), fn-lookup partiel (2D à venir), engine-range, engine-sort
- [x] Autres features selon priorités de `docs/recherche-tableur.md` (vague 2, voir section dédiée)
- [x] Split de `app.ts` en `appState/appGrid/appApi/appWidgets` (split-app) ; contrôle > 200 lignes à refaire à chaque vague

P3 : livraison
- [x] Packaging Linux config (deb + AppImage, `release.yml`, `src/config/packaging.test.ts`) ; reste : valider `release.yml` via workflow_dispatch sur GitHub
- [ ] Test de l'installeur Windows (MSI/NSIS construits en T1.7)
- [ ] T4.1 Analyser LibreOffice Calc via REA, sans copier de code (optionnel ; "Libre Fiscal" à confirmer)
- [ ] T5.2 Mettre à jour CLAUDE.md (commandes build/test, état réel : section Status encore "no app code")
- [x] Pépite 2 voyage dans le temps : historique local dans le fichier, curseur, instantanés, comparaison (`docs/historique-local.md`, palette « Historique et versions… »)
- [ ] Décision pépites 1 (flèches) / 2 (voyage dans le temps) : abandon ou bonus si le temps le permet

## Phase 8 : Modules intégrés, câblage à faire

- [x] Modules sans câblage UI : wf-sort-model (tri), toast, colors, floating (mini-barre), filter-logic, autosave-logic
- [x] numfmt-date (format Date), alignement `DATE`/`YEAR`/`MONTH`/`DAY`/`serialToISO` sur la convention 1900 de `numfmt.ts`
- [x] Tests unitaires ajoutés : engine-functions, ui-cellview-model, ui-palette-formulabar, ui-app-api-state, `functions.wired.test.ts`, `dateConsistency.test.ts`
- [x] engine-matrix-na : plages 2D dans l'évaluateur (VLOOKUP, HLOOKUP, INDEX 2D : 3 `it.todo` dans `functions.wired.test.ts`) + code `#N/A` (IFNA, lookups)
- [x] style-textcolor : `CellStyle.color` (couleur du texte) manquant
- [x] Câblage UI : barre N1, Σ, tri, filtre, couleurs, mini-barre flottante, toast, autosave
- [x] Câblage UI : menu Fichier unique, largeur de colonnes, Ctrl+D / Ctrl+R
- [x] Tests e2e par fonctionnalité (worktree `e2e-playwright-setup` en cours)

## Vague 2 : fonctions manquantes du tableur (recherche E/I + IronCalc)

Audit 2026-10-24 : les cases « Câblage UI », engine-matrix-na, style-textcolor et e2e de la Phase 8 étaient déjà codées (cochées ici).
- [x] refs-shift : références `$A$1`/`A$1`/`$A1` + décalage des références à la recopie (Ctrl+D/R) et au copier-coller interne
- [x] insert-delete : insérer/supprimer lignes et colonnes, références ajustées, `#REF!`, un pas d'undo
- [x] format-more : souligné (Ctrl+U), bordures (Toutes/Contour/Bas/Aucune), renvoi à la ligne
- [x] functions-more : 61 fonctions (ROUNDUP, SUMPRODUCT, STDEV, AVERAGEIFS, TEXTJOIN, SUBSTITUTE, ISERROR, IFS, SWITCH, EOMONTH, NETWORKDAYS, CHOOSE…)
- [x] freeze-panes : figer première ligne / colonne / jusqu'à la cellule active (palette), persisté
- [x] cross-sheet : références `Feuille2!A1` et `'Nom avec espace'!A1:B3`, recalcul entre feuilles
- [x] keys-nav : Ctrl+flèches façon Excel, Début, Ctrl+Début/Fin, PgPréc/PgSuiv, Ctrl+A, Ctrl+Espace, Maj+Espace, Ctrl+PgPréc/PgSuiv (feuilles), Ctrl+Entrée, Alt+Entrée, F4
- [x] Littéraux d'erreur dans les formules (`=#REF!`, `#N/A`)
- [ ] Suites : barre de formule multi-ligne ; PgPréc/PgSuiv qui défile d'une page ; Ctrl+A « région courante » ; réécrire les formules au renommage de feuille et lors des insertions (réf. inter-feuilles) ; couper-coller qui met à jour les références ; couleur/épaisseur de bordure ; hauteur de ligne / redimensionnement des lignes ; validation de données ; XLSX
- [ ] Vérification à la main dans Tauri (volets figés sticky, bordures en clair/sombre)

## Later (non planifié)

- [x] Macros Lua (wasmoon) : remplacées par l'implémentation fengari + éditeur (Phase 8 Macros Lua)
- [ ] Macros : accès aux styles et à plusieurs feuilles
- [x] Moteur de recalcul (graphe de dépendances, #CYCLE) : fait (I1)
- [x] Pépite Cellules vivantes (SPARKLINE/BAR/TREND) : fait (I6 + I8)

## E2E (Playwright)

- [x] Infra e2e : `playwright.config.ts`, `e2e/helpers.ts`, `e2e/smoke.spec.ts`, job CI
- [x] Tests e2e par fonctionnalité à écrire (édition, formules, undo/redo, CSV, onglets, palette, cellules vivantes)

## Fait

- [x] Dépôt GitHub privé créé et master poussée
- [x] CLAUDE.md commité (6e1e34d)
- [x] Dockerfile / compose / CI écrits (non validés)
- [x] Section TDD ajoutée
- [x] Synthèse de recherche écrite
- [x] 3 maquettes de pépites créées
- [x] Design : design system `mockups/design/` (tokens, components, composants.html, DESIGN.md) + artefact Claude Design (10 artboards, non aligné : `mockups/design/` prioritaire)
- [x] Intégration fixes: Nouveau confirme les modifications non enregistrées, Ctrl+Z/Y ignorés dans les champs texte, maquette workflow-ux corrigée, docs de modules
- [x] benchmark-captures: docs/benchmark-captures.md (benchmark UI tableurs, patterns à reprendre/éviter)
- [x] Onboarding: écran d'accueil au lancement (`src/ui/onboarding/`, tokens `--ob-*` Hermes en fin de `tokens.css`), liste des feuilles + « Créer », `?onboarding=0` pour l'ignorer (e2e `openApp`), spec `e2e/onboarding.spec.ts`

## Refonte visuelle UI (revue 1re phase, branche wt/ui-review)

Captures: scratchpad de session (light/dark, 1200x800). Revue faite sur l'arbre principal (plus récent que ce worktree). Aucune modif de style en phase 1.
Direction: sobre, contrasté, encre indigo; deltas tokens: `--c-line` .09 -> .14 (clair) / .10 -> .16 (sombre); `--c-text-3` -> >= 5:1 sur surface-2; `--c-accent-soft` .10 -> .14; barre active de la toolbar = trait 2px accent (pas de bandeau plein); `--r-md` 10 -> 8, `--r-lg` 14 -> 12; `--sh-2` plus net (0 6px 20px .14 + 0 0 0 .5px); `--fs-md` 13 -> 13.5 cellules; icônes 18 -> 20px (variantes redesign); en-têtes col/ligne `--fw-medium` + `--c-text-2`.
Chaque tâche: écrire d'abord le test de rendu (vitest/jsdom, lecture CSS/styles calculés) puis le style.

Classement par gravité (P0 = pire)
- [x] P0 Grille: nombres alignés à gauche (cellule `display:flex` => `text-align` sans effet, voir `grid.css` `.dkg-cell`). Test: `src/ui/cellview.test.ts` cellule numérique => `justify-content:flex-end`; texte => start; erreurs `#CYCLE!/#DIV/0!` centrées/en `--c-error`. Fichiers: `cellview.ts`, `grid/grid.css`.
- [x] P0 Grille: erreurs (#CYCLE!, #DIV/0!) sans couleur (texte normal). Test: classe `dk-cell--error` => `color:var(--c-error)` + fond `--c-error-soft`. `cellview.ts`, `grid.css`.
- [x] P1 Toolbar: bouton « Fichier » = pilule blanche ~220px (flash en sombre), hors échelle; la barre saute de ~2px au toggle. Test: `styles.test.ts` `.dk-toolbar` hauteur stable (`--toolbar-h`) minimal vs ouvert; menu Fichier largeur <= 96px, fond `--c-surface-2`. `toolbar/menus.ts`, `components.css`.
- [x] P1 Toolbar: pas de hiérarchie (tout gris, séparateurs faibles, filet accent 2px sous la barre trop prégnant). Test: `.dk-iconbtn--active` contraste >= 3:1; séparateur `--c-line-strong`. `components.css`, `tokens.css`.
- [x] P1 Sidebar: 3 sections identiques (titres 11px gris `--c-text-3`, faibles), liste fonctions = mono + signature gris clair peu lisible, panneau « Cellule » sans cadre. Test: contraste titres >= 4.5:1; `.dk-item__meta` >= 4.5:1; lignes fonctions 28px. `sidebar/`, `components.css`.
- [x] P1 Cellule active / sélection: anneau 2px sans cran (identité DESIGN.md), plage sélectionnée à peine visible en sombre. Test: `.dkg-active::after` cran 6px accent; `.dkg-range` alpha >= .14. `grid.css`.
- [x] P2 Grille: lignes `--c-line` trop faibles en sombre, en-têtes sans hiérarchie, ligne 1 sans repère d'en-tête; barre de défilement/ligne 23 coupée. Test: contraste ligne/surface >= 1.3:1; en-têtes `--fw-medium`. `grid.css`, `tokens.css`.
- [x] P2 Barre de formule: nom de cellule (« B3 ») isolé, `fx` gris, chevron outils ambigu (sans libellé/infobulle visible), pas de séparation avec la toolbar. Test: `.dk-formula` hauteur `--formula-h`, bordure basse `--c-line`; bouton toggle `aria-label` + `title`. `components.css`, `appTools.ts`.
- [x] P2 Palette Ctrl+K: sélection pleine accent très saturée (clair), badge `Ctrl+O` bordure noire en sombre, liste coupée net en bas, pas de groupes/icônes. Test: item sélectionné = `--c-accent-soft` + texte `--c-text`; badge `.dk-kbd` bordure `--c-line-strong`; `max-height` + fondu bas. `palette/palette.css`.
- [x] P2 Popover de filtre: compteurs gris à droite peu lisibles, cases natives (bleu système, hors accent), « (Vides) 994 » bruit, boutons sans hiérarchie. Test: `accent-color:var(--c-accent)`; (Vides) en dernier + `--c-text-3`; bouton OK `.dk-btn--primary`. `grid/filterPopover.ts`, `grid.css`.
- [x] P3 Onglets: onglet actif = pilule discrète, « + » minuscule, onglets inactifs `--c-text-3`; bandeau de pied sans séparateur marqué. Test: onglet actif `--c-surface` + trait accent 2px bas; cible « + » >= 24px. `tabs/tabs.css`.
- [x] P3 Menu contextuel: non capturé par script (ouverture via clic droit réel requise): à vérifier à la revue (ombre `--sh-2`, rayon `--r-md`, danger rouge). `contextmenu/contextmenu.css`.
- [x] P3 Toasts/statut: non visibles dans les captures (aucun message déclenché); vérifier position/contraste (`toast/`). Test: toast `role=status`, fond `--c-overlay` contraste >= 4.5:1.
- [ ] P3 Cellules vivantes: sparkline fine (1px) et barres sans marge, TREND rouge seul sans contexte; en sombre barres pâles saturées. Test: `engine/live` SVG `stroke-width>=1.5`, `gap` barres >= 1px, couleurs via `--c-accent`/`--c-error`. `live/*.ts`.
- [x] Grille: Entrée sur cellule non éditée = ouvre l'édition (comme F2); Maj+Entrée monte, Ctrl/Alt+Entrée ignoré. Test: `ui/grid/grid.test.ts`. `grid/gridKeys.ts`.

## Refonte Hermes (v2, canvas https://claude.ai/artifact/V1WWvok6xhPzTSruqxpWVk)

- [x] H1 Tokens bleu #0000F2 + papier, thème sombre nuit #19192F (`theme-dark.css`, `ui/theme.ts`), chrome bleu (`chrome.css`), polices locales (`fonts.ts`), tokens `--c-code-*` pour l'éditeur de macros. Tests : `styles/hermes.test.ts`, `ui/theme.test.ts`, `styles/styles.test.ts` (contrastes chrome).
- [x] H2 Onglets actifs pleins bleus en capitales condensées ; en-têtes de grille en DM Mono ; fonds pleins via `--c-accent-solid` (menus, palette, filtre).
- [x] H3 Barre de menus à un niveau (`ui/menubar/spec.ts` + `deps.ts`, rendu `createMenuBar` dans `toolbar/menus.ts`), toujours visible ; Paramètres dans Fichier (Ctrl+,, `ui/dialogs/settings.ts`) ; thème dans Affichage ; Alt+F11 = éditeur de macros. Tests : `ui/menubar/menubar.test.ts`, `ui/dialogs/dialogs.test.ts`, `ui/app.test.ts`.
- [x] H3b Scripts branché sur `app.openMacros` / `app.macros.list()` / `app.runMacro` (menu relu à chaque ouverture).
- [x] H4 Accueil : nom, Nouveau classeur / Ouvrir / Importer CSV, récents (nom + chemin), Atlas à droite (`src/assets/atlas-*.png`, `ui/art.ts`), sans libellé décoratif ; réglage « accueil au démarrage ». À propos (Aide) avec l'Atlas et les crédits.
- [ ] H4b Splash de lancement Tauri et bannière d'installeur avec l'Atlas.
- [x] H5 Barre d'outils sans Fichier ni Ouvrir/Enregistrer (couverts par la barre de menus et Ctrl+O/S).
- [ ] e2e Playwright non relancés dans le conteneur cloud (navigateur absent) : à relancer en local.

## Formatage conditionnel

- [x] CF1 Moteur `src/engine/cf/` : valeur (>, ≥, <, ≤, =, ≠, entre, hors de ; opérandes nombre, texte ou =formule), texte (contient, ne contient pas, commence, se termine), vides / non vides, erreurs / sans erreur, doublons / uniques, n (ou n %) plus élevées / basses, au-dessus / en dessous de la moyenne, formule relative, échelles 2-3 couleurs, barres de données ; priorité = ordre de la liste
- [x] CF2 Persistance `.dktable` (`DocSheet.cf`, validation stricte), annulation (un pas par modification), plages et formules suivent l'insertion / suppression de lignes et colonnes
- [x] CF3 Rendu grille (par-dessus le style de la cellule, recalcul à chaque édition) + encre contrastée automatique sur les remplissages
- [x] CF4 Gestionnaire : Format > Formatage conditionnel… et palette (`format.cf`) ; liste (monter, descendre, modifier, supprimer) + éditeur sur la sélection
- [ ] CF5 Suites : jeux d'icônes, arrêt si vrai, règles sur dates (période), copier le format conditionnel avec le copier-coller, API Lua
- [ ] CF6 Vérification à la main dans Tauri

## Phase 8 : Macros Lua
- [x] M1 Moteur Lua sandboxé (fengari) + API `sheet` + limite d'instructions (`src/macros/`)
- [x] M2 Autocomplétion Lua (API feuille, bibliothèque standard, noms locaux)
- [x] M3 Éditeur CodeMirror + panneau Macros + commandes palette/Alt+F11, chargement paresseux
- [x] M4 Macros persistées dans `.dktable` ; exécution = un pas d'annulation
- [x] M5 Menu « Scripts » listant les macros (barre de menus, refonte Hermes) ; raccourcis par macro non faits
- [x] M7 Édition des macros en onglet plein écran (liste + crayon), panneau sans éditeur
- [ ] M6 Vérification dans la fenêtre Tauri (`npm run tauri dev`)

## Saisie des formules
- [x] F1 Autocomplétion des fonctions après « = » (cellule + barre de formule) : liste filtrée avec description, signature de la sélection, flèches/Entrée/Tab/Échap, aide de signature avec l'argument courant (`ui/formula/`). Tests : `fnComplete.test.ts`, `fnPopup.test.ts`, `wiring.test.ts`, e2e `feat-fncomplete.spec.ts`.

## Contrôles de la grille façon Google Sheets
- [x] G1 En-têtes : clic = colonne/ligne entière, Maj+clic / glisser étendent, coin = tout (`ui/grid/mouse.ts`) ; clic droit = insérer, supprimer, trier, « Figer jusqu'à la colonne C / ligne 5 », libérer, effacer (`ui/headerMenu.ts`, `ui/freeze/freezeMenu.ts`) ; Affichage « Figer jusqu'à » ; poignées de gel glissables (`ui/grid/freezeHandle.ts`).
- [x] G1b Rendu de la sélection retravaillé ; ajustement des colonnes au contenu (clic droit, palette, double-clic sur la bordure).
- [x] G1c Fond d'en-tête dédié `--c-header` (clair/sombre) ; correctif : les en-têtes sélectionnés laissaient voir les cellules défilant dessous.
- [x] G1d Clic droit sur une sélection multiple : le menu s'ouvre et garde la sélection (avant, le mousedown la réduisait à une cellule).
- [x] G3 Poignée de recopie (cran du coin bas-droit de la sélection) : glisser vers le bas / haut / droite / gauche prolonge les séries (nombres, dates texte, mois/jours FR, « Item 1 », motifs, formules décalées), aperçu pendant le glisser, Ctrl = série ↔ recopie, double-clic = jusqu'à la fin des données voisines (`engine/series*.ts`, `ui/grid/{seriesFill,fillHandle}.ts`, `docs/serie-fill.md`). Tests : `series.test.ts`, `seriesFill.test.ts`, `fillHandle.test.ts`, e2e `feat-fillhandle.spec.ts`.
- [ ] G3b Recopie : copier aussi les styles/formats de la source, défilement automatique pendant le glisser, jours ouvrés via menu, séries de dates sur numéros de série formatés en date (mois/années), réduire la zone en glissant vers l'intérieur.
- [ ] G2 Masquer/afficher des colonnes et lignes, hauteur de ligne réglable.

## Outils comptables (rapport https://claude.ai/artifact/1cZrDkd42Y4xaXhtuX7Y3Z)
- [x] Format Comptabilité ; SLN, SYD, DB, DDB, VDB, AMORLINC, AMORDEGRC ; IPMT, PPMT, PV, FV, RATE, NPER, CUMIPMT, CUMPRINC ; IRR avec estimation, MIRR, XNPV, XIRR ; SUBTOTAL, AGGREGATE ; MROUND, YEARFRAC, DAYS360 ; export FEC (Fichier) + en-têtes FEC (Données)
- [ ] Suites : lignes masquées pour SUBTOTAL 101-111 / AGGREGATE ; contrôle FEC avec Test-Compta-Demat (DGFiP) ; tableau croisé simplifié

## dk doc (documents de texte liés aux feuilles, voir `docs/dk-doc.md`)
- [x] D0 Format : `docs?` dans `.dktable` validé (`io/docsFormat.ts`), dépendances ProseMirror
- [x] D1 Schéma, magasin, éditeur (chargé à la demande), onglet document, historique, persistance, palette « Nouveau document »
- [x] D1b Menu Fichier « Nouveau document » ; menu « Insertion » à la place de Feuille / Données quand un document est ouvert ; renommer / supprimer testés dans l'interface
- [x] D2 Références `@` (cellule, recherche par noms), puces vivantes, carte au survol, `#REF!`, rafraîchissement après recalcul, clic = ouvrir la cellule, Alt+← = revenir (`doc/refs.ts`, `refView.ts`, `mention.ts`)
- [x] D3 Tableaux liés (coller, colonnes affichées, morceau A3:D4), graphiques liés (barres, tendance)
- [x] D5 Puce de calcul `=` (formules du moteur, `@`, formats, mini-graphiques, exports)
- [ ] D6 Bloc « Calcul » à lignes libellées (variables par libellé)
- [x] D7 Rendu Live Preview façon Obsidian : texte Markdown comme document (CodeMirror 6), syntaxe cachée hors du curseur, puces `{{@…}}` / `{{=…}}` et blocs ```dkblock en widgets, anciens documents ProseMirror convertis (`doc/md/`, `doc/live/`)
- [x] D9 Blocs de code : colorisation syntaxique par langage, rendu Live Preview (``` masqués, langage affiché), export HTML cadré
- [x] D8 Style administratif classique du contenu des documents (A4, sérif, titres noirs), exports HTML/PDF alignés
- [x] D4 Vue partagée `Ctrl+\`, exports Markdown / HTML / PDF (`Ctrl+E`), e2e `feat-doc.spec.ts`

- [x] Somme rapide (Σ, Alt+=) : une sélection multi-cellules est sommée (une SOMME par colonne dessous, ou à droite d’une ligne), `ui/autosum.ts`, tests unitaires + e2e

- [x] Plages ouvertes façon Sheets (`B2:B`, `B:B`, `A:C`, `2:5`, avec préfixe de feuille) : parseur, évaluation sur la plage utilisée, dépendances, recopie, insertion/suppression, SPARKLINE/BAR/TREND, puces de document, `getRangeValues` (`engine/openrange.ts`)
- [x] Filtre de colonne : champ de recherche en tête du popover (focus à l'ouverture, casse/accents ignorés, « Tout sélectionner » sur les résultats visibles, Entrée = OK, Échap ferme). `filter.ts matchesSearch`, `grid/filterPopover.ts`; tests unitaires + `e2e/feat-filter.spec.ts`
- [x] Règle CLAUDE.md : captures d'écran (clair/sombre, `docs/screenshots/`) obligatoires dans toute PR de fonctionnalité visible
- [x] Largeurs de colonnes enregistrées dans `.dktable` (`DocSheet.colWidths`, lettres → px, absent si aucune), restaurées à l'ouverture (anciens fichiers OK), annulables (glisser et ajustement = un pas), suivent l'insertion/suppression de colonnes. `io/colWidthsFormat.ts`, `Entry.widths`; tests unitaires + `e2e/feat-colwidth.spec.ts`
- [ ] Secteur recherche v1 (`prototypes/oauth-sdk/`): lancer la boucle live (`CLAUDE_CODE_OAUTH_TOKEN`, plafond 20 USD) -> `docs/recherche/fonctionnalites.md`, puis ajouter les tâches issues des 4 axes
- [x] Secteur recherche v1: run live (2,20 $ / 20 $), synthèse 4 axes dans `docs/recherche/fonctionnalites.md`
- [x] Carte `carte-des-dependances-interactive`: panneau « Qui utilise cette cellule ? » (palette `data.depmap`, `engine/model/depmap.ts`, `ui/dialogs/depmap.ts`, rapport `docs/rapports/`)
- [x] Carte `audit-de-modele-integre`: panneau « Audit de modèle » (palette `data.audit`, `engine/model/audit.ts`, `ui/dialogs/audit.ts`; constantes, formules incohérentes, plages tronquées, volatiles, cycles; clic = va à la cellule), e2e `e2e/feat-audit.spec.ts`
- [x] Carte `plages-tronquees-detectees`: correction en un clic (`Finding.fix`, bouton `.dk-audit__fix`) + détection nombres stockés en texte, `docs/rapports/plages-tronquees-detectees.md`
- [ ] Recherche, axe 1 (idées nouvelles): graphe de dépendances inter-feuilles en un clic, historique par cellule, vue « fiche » d'une ligne
- [ ] Recherche, axe 2 (absent de dk-table): validation de données (fait, voir plus bas), tableaux nommés (Excel Tables), tableau croisé dynamique
- [x] Carte `atteindre-formules-constantes`: palette + menu Affichage « Surligner formules / constantes » (`engine/audit-kinds.ts`, `ui/grid/kinds.ts`, classes `dkg-kf`/`dkg-kc`; `docs/formules-constantes.md`), e2e `e2e/feat-formules-constantes.spec.ts`
- [x] Carte `atteindre-special-go-to-special`: Ctrl+G « Atteindre spécial » (vides, formules, constantes, types de résultat, lignes visibles; `engine/special.ts`, `ui/appSpecial.ts`, `ui/dialogs/goToSpecial.ts`; `docs/atteindre-special.md`, rapport `docs/rapports/atteindre-special-go-to-special.md`), e2e `e2e/feat-atteindre-special.spec.ts`
- [x] Carte `formules-a-resultat-debordant-spill-et-fonctions-sheets`: spill minimal + SPLIT/UNIQUE/FILTER/SORT, `#SPILL!` (`docs/spill.md`, rapport `docs/rapports/`)
- [x] Carte `fonctions-nommees`: fonction personnalisée (nom, paramètres, corps) dans `.dktable`, dialogue Données > Fonctions nommées… (`docs/fonctions-nommees.md`)
- [ ] Recherche, axe 3 (négligé ailleurs): fenêtre Espion, appareil photo (plage vivante), analyse rapide (Ctrl+Q)
- [ ] Recherche, axe 4 (mal fait ailleurs): ne pas convertir automatiquement les données (zéros initiaux, gènes -> dates), annulation conservée après macro, performance sur grosses feuilles (annulation après macro : fait, `docs/rapports/annulation-detruite-par-les-macros.md`)
- Boucle autonome (`prototypes/oauth-sdk/`, panneau local `boucle.ts`), état honnête :
  - [x] research : exécuté en réel une seule fois (2,20 $, version série); version parallèle + budget partagé testée avec requêtes factices seulement
  - [x] design (maquette HTML autonome produite d'abord dans `docs/design/<date>.html`, lue par l'implementation) / implementation / correction : implémentés (`sectors.ts`, prompts + outils sans git) et testés avec requêtes factices, jamais lancés en réel
  - [x] panneau (`server.ts`, `panel.html`, budget en euros, Go/Stop, SSE) et git (`git.ts` : `developpement`, worktree par secteur, fusion si `npm test` + tsc verts, jamais master/push) : testés avec factices, jamais lancés en réel
  - [x] résumé Haiku par phase (`summary.ts`, repli déterministe sans LLM, événement `summary`, `ok` sur `end`); [x] zone résumé + cartes d'agents + barre de phases dans `panel.html` ; événements start/end par axe de recherche (contrat panneau vérifié par test)
  - [x] moodboard de recherche, côté données (`moodboard.ts` + tests, routes `/moodboard` et `/moodboard.html` dans `server.ts`, câblage `boucle.ts`); la page `moodboard.html` est faite à part (worker-mood-view)
  - [x] suivi du design en direct (`designs.ts`, routes `/designs*` + `/design.html`, événements `file`, `recap.html` écrit avant le commit); reste : page `design.html` + `recap.ts` (worker-design-view); `boucle.ts` importe `./recap` (tsc rouge tant que non fusionné)
  - [x] historique des designs : noms horodatés jamais écrasés (`docs/design/<date>-<HHmmss>.html`, `recap-…`), `/designs` = union actif + principal + `developpement` (`designStore.ts`), sélecteur « Historique » dans `design.html`
  - [x] panneau Boucle redessiné (DA Hermes): bouton unique Go/Stop, frise des phases avec agents imbriqués (plus de doublon Phases/Agents), budget en euros sur une ligne, bandeau d'erreur persistant, état de connexion SSE, journal horodaté avec filtre « Erreurs seulement » et défilement non forcé; captures `docs/screenshots/boucle/` (`shots.mjs`)
  - [x] panneau Boucle : polices Hermes réellement chargées (`fonts.css`, `fontRoute.ts`) et `/events` ouvert tout de suite + `: ping` (plus de « Connexion perdue » à vide); captures `docs/screenshots/boucle-polices/`
  - [x] panneau Boucle (run réel) : échec de fusion détaillé (`cleanOutput.ts`), journal sans ANSI ni doublons, « reste » du budget stable (`left()`), euros partout, design non fusionné visible; captures `docs/screenshots/boucle-run/`. À vérifier sur la machine de ANGELO : quel test échoue dans le worktree (le journal le dira désormais)
  - [x] Boucle : thème de l'application (tokens `src/styles` servis sous `/theme/`, `theme.js`, alias dans `panel.css`), clair + sombre; captures `docs/screenshots/boucle-theme/`
  - [ ] Premier run réel complet de la boucle (l'utilisateur appuie sur Go); limites connues : `index.ts` = recherche seule en CLI
- [x] Boucle, design : `/design` + outil Artifact NON atteignables en headless (sondes SDK 0.3.310 à coût nul, jeton OAuth et connexion stockée, `settings.enableArtifact`, `skills: all` : `Artifact`/`ClaudeDesign`/`Skill` absents des outils; doc : Artifact désactivé par défaut dans le SDK et publication réservée à une session claude.ai; `no_transport` ne concerne que PushNotification). Chemin retenu : le secteur design écrit lui-même une maquette HTML autonome (clair + sombre, interfaces) dans `docs/design/<date>.html`, lue par l'implementation
- [x] Boucle optimisée (`docs/boucle-optimisee.md`): options Claude Code complètes (outils, skills, `trancheur`, zéro question), résumés sans LLM par défaut, vérifs git en parallèle, mémo serveur, clients sans rechargement inutile; mesures avant/après
- [x] Boucle, cartes et rapports: état par carte (idée/piste/en cours/preuves/terminée/bloquée), `docs/rapports/<id>.md` validé (tests ok + captures), boucle jusqu'à toutes les cartes terminées (`complete`), moodboard en colonnes avec tiroir de rapport en direct (SSE `card`)
- [x] Boucle, toile design libre (`docs/design-canvas.md`): scripts et animations permis dans l'iframe isolée, runtime (thème, pause, erreurs), largeurs/zoom/comparaison, skill `.claude/skills/design-canvas`
- [x] Boucle, temps réel et fiabilité (`docs/boucle-temps-reel-logs.md`): moodboard poussé par événements SSE numérotés (reprise `Last-Event-ID`, pastille agent, fraîcheur, état de liaison), doublons fusionnés, garde de fusion restreinte (pas de push si suite non verte, arbre vérifié, une suite à la fois), parseur de preuves (accolades, « sans objet »), rapports périmés réparés, journal technique JSONL masqué + `/logs` + `/diagnostic`, tests de chronométrage remplacés par des compteurs; captures `docs/screenshots/boucle-temps-reel/`
- [ ] Boucle: tests e2e vitest `src/ui/appDoc*.test.ts` rouges sous charge sur la machine de ANGELO (3-9 s, timeouts): à fiabiliser avec le fil « Fiabiliser les tests sous Windows »; non reproduits sur Linux (2176 verts); exécution des seuls tests liés d'abord non faite
- [ ] Boucle: préchauffage de processus (`startup()` alpha) non retenu; à reconsidérer si l'API se stabilise
- [x] Boucle persistante: lots de 6, progrès par avancée d'état, rotation des cartes bloquées, raison d'arrêt (terminée / budget / bloquée) dans le panneau, jamais « terminée » s'il reste des cartes (`rounds.ts`)
- [x] Boucle: agents d'implémentation en parallèle sur cartes indépendantes (`BOUCLE_PARALLEL`, défaut 3): worktree par carte, fusion sérialisée, repli en série sur conflit, budget réparti, panneau (`parallel.ts`, `independent.ts`)
- [x] Boucle: cartes « Terminées » durables (registre `.boucle/termines.jsonl`, survit nouvelle tournée, redémarrage, nouveau Go)
- [x] Boucle: design absent de la toile sous Windows (arguments git non protégés sous cmd.exe, commit perdu): `shellArgs.ts`, fusion refusée sans commit
- [x] Boucle, optimisation (`docs/boucle-optimisee.md`, section « Optimisation de la boucle »): retry informé sur la branche refusée avec reprise de session SDK et borne de 3 essais, preuves et TODO.md écrits par le code, `vitest related` par carte + une suite complète par lot avec push seulement si verte et reprise des fusions non poussées, qualification des cartes par lot (doublons, S/M/L, découpe, dépendances), contexte minimal, état persistant `.boucle/state.json`, constantes uniques `limits.ts`
- [ ] Boucle, reste à faire après l'optimisation: le design ne reçoit pas encore les cartes retenues (il tourne avant les tournées; `needs_design` n'écarte une carte que si `designPending`); dédoublonnage par mots-clés de `src/` non fait (titres, TODO.md, termines.jsonl seulement); mesurer `usage`/cache sur un run réel; validation manuelle (voir rapport de la branche `claude/project-thread-6vkr76`)
- [x] Boucle: tests e2e de bout en bout (`docs/boucle-e2e.md`, `e2e/boucle*`): vrai serveur + vrai git + faux agents + Playwright sur les 3 pages; bugs corrigés: panneau (conflit réessayé en échec, run précédent additionné, Stop muet), coupure SSE (ids + `Last-Event-ID`), worktrees non fusionnés jamais retirés (`release`), frise du designer sans fichier écrit (`flush`). Reste: doublons de cartes (même titre dans deux axes, idée retitrée) = fil design de la Boucle
- [x] Boucle: réconciliateur d'états (`reconcile.ts`): faux « en cours » supprimés, orphelines et finies-sans-rapport visibles (anomalies dans le moodboard et le journal), `docs/boucle-optimisee.md`
- [x] Boucle: correction déclenchée par le code seulement (fusion refusée ou preuves manquantes), routage des modèles haiku-first avec escalade (`routing.ts`, `BOUCLE_MODELS`)
- [x] Boucle: push automatique de `developpement` après fusion validée (`pushDev`, jamais master, `BOUCLE_PUSH=0` pour couper)
- [x] Boucle: un test déjà rouge sur `developpement` ne bloque plus la fusion d'une carte (référence à la base, anomalie dans le journal), tests git à délai adapté (Windows)
- [x] Boucle: recherche rapide et économe (haiku d'abord, 8 tours, une passe, doublons, synthèse fusionnée, saut si 12 cartes non terminées)
- [ ] Boucle: sortie structurée du SDK (`outputFormat` json_schema) et hooks pour valider sans relire les fichiers; à étudier
- [x] Boucle: tests/parseurs tolérants au CRLF (checkout Windows), `.gitattributes` eol=lf
- [x] Boucle, comparaison app vs panneau (clair/sombre): barre du haut alignée sur la barre de menus, captures `docs/screenshots/boucle-theme-app/`

- [x] Défilement et sélection propres à chaque feuille : `appGrid.buildGrid` mémorise scrollTop/scrollLeft + sélection de la feuille quittée (WeakMap par entrée, non enregistrés dans le fichier) et les restaure au retour; une feuille neuve démarre en A1 en haut. Tests `appScroll.test.ts` + `e2e/sheet-scroll.spec.ts`. Onglets doc/macro non concernés (éditeurs recréés à l'ouverture)

## Boucle autonome (autoloop)

- [x] Étape 1 : squelette `tools/autoloop/` (config, budget, journal, redact, agent injectable + fake, loop pur, main `--dry-run`), tests `tools/autoloop/__tests__/`, tsconfig inclut `tools`. Aucun appel réel au SDK.
- [x] Étape 2 (MVP) : cycle audit -> dédoublonnage (empreinte `fp`) -> issues `auto:bug` (`github.ts`, `dedupe.ts`, `roles/audit.ts`, `checks.ts`, `cycle.ts`, `live.ts`); `--live` branché mais jamais lancé; SDK en devDependency
- [ ] Étape 3+ : worker/reviewer réels, PR, état `state.json`, worktrees
- [x] Fix e2e `shell-tabs.spec.ts` : test de sélection aligné sur la sélection propre à chaque feuille (PR #31)
- [x] Tableau croisé : `engine/pivot.ts` + `pivotCalc.ts` (lignes, colonnes, SUM/COUNT/AVG, champ calculé, totaux), dialogue `ui/dialogs/pivot.ts` (palette « Tableau croisé… ») -> nouvelle feuille « Croisé ». Rapport `docs/rapports/tableaux-croises-de-calc-incomplets-non-verifie.md` Defaut ameliore: ligne = 1re colonne texte repetee, valeur hors identifiants.
- [x] Transformations rejouables (mini Power Query) : `engine/query.ts` (filtrer, scinder, dédoublonner, pivoter), dialogue `ui/dialogs/query.ts` (palette « Transformations… »), `engine/queryLua.ts` (macro Lua, pivot inclus), `ui/appLive.ts` (rejeu auto), `docs/query.md`. Rapport `docs/rapports/transformations-rejouables-mini-power-query.md` Rejeu automatique via `ui/appLive.ts`.
- [x] Diff / fusion `.dktable` : `io/diff.ts` (`diffCells`, `merge3`, `diffDocs`), dialogue `ui/dialogs/diff.ts` (palette « Comparer avec un fichier… », lecture seule). Rapport `docs/rapports/diff-et-fusion-cellule-par-cellule-du-dktable.md`. Fusion 3 voies : aperçu lecture seule fait (io/mergeDocs.ts, ui/dialogs/merge.ts, menu Données « Fusionner… », palette file.merge, captures merge-apercu-*.png); reste : résolution conflit par conflit + application du résultat

## Cartes boucle (implémentation)

- [x] texte-en-colonnes : Données > Texte en colonnes (virgule, point-virgule, tabulation, espace, autre, fusion, largeur fixe, format texte par colonne), `engine/textsplit.ts` + `ui/dialogs/textToCols.ts`, `docs/texte-en-colonnes.md`
- [x] plafonds-google-sheets : toast pour cellule > 50 000 car., ligne > MAX_ROWS, import CSV volumineux/tronqué, `ui/limits.ts`, `docs/plafonds.md`
- [x] classeur-sans-plafond-avec-limites-visibles : plus de plafond de lignes (`engine/rows.ts`, la feuille grandit par blocs de 1000), indicateur de poids/niveau dans la barre d'état (`engine/weight.ts`, `ui/statusbar/weightBadge.ts`); rapport `docs/rapports/classeur-sans-plafond-avec-limites-visibles.md`, `docs/plafonds.md`. Reste : capture du niveau « lourd » (exige 200 000 cellules en e2e)

- [x] Correction: npm test (1939 ok, 1 skipped) + tsc verts; rapports de docs/rapports/ verifies (fichiers et captures presents)
- [x] statistiques-de-selection-dans-la-barre-d-etat : `ui/statusbar/` (stats.ts, statusbar.ts), Moyenne/Nb/Nb numérique/Min/Max/Somme dès 2 cellules; rapport `docs/rapports/statistiques-de-selection-dans-la-barre-d-etat.md`
- [x] Tests fiables sous Windows/charge: attentes conditionnelles (`src/test-wait.ts`, `prototypes/oauth-sdk/testUtil.ts` waitFor/deferred/flush) au lieu de délais, git réel hermétique (`gitEnv`: config machine ignorée, modèle de hooks vide), timeouts vitest 30 s, CRLF dans `designStore`; `parallel.test.ts`/`pipeline.parallel.test.ts` laissés à l'autre fil

- [x] CI/CD rapide: `ci.yml` léger sur push hors main (tsc + vitest --changed), `ci-full.yml` (test, cargo, e2e 3 shards) vers/sur main, concurrency, Chrome du runner; `docs/ci.md`, `src/config/ci.test.ts`
- [x] import-texte-d-abord-avec-rapport-de-conversions-risquees : import CSV texte d'abord, rapport par colonne accepter/refuser (`io/csvText.ts`, `ui/dialogs/importReport.ts`, `docs/import-texte.md`)
- [x] decimal-exact-mode-comptable : option par classeur (Paramètres), arrondi 15 chiffres (`engine/decimal.ts`), écart affiché ≠ stocké signalé (`dkg-gap`), champ `.dktable` `decimal`; `docs/decimal-exact.md`, rapport `docs/rapports/decimal-exact-mode-comptable.md`
- [x] validation-a-l-epreuve-du-collage : règles de validation (entier, décimal, liste, longueur) contrôlées aussi au collage, remplissage et ouverture/import; panneau des cellules invalides + « Corriger » (`engine/validation/`, `ui/validation/`, `ui/appValidation.ts`, `docs/validation.md`, rapport `docs/rapports/validation-a-l-epreuve-du-collage.md`)
- [x] identifiants-longs-intacts : saisie > 15 chiffres gardée en texte exact et signalée (`engine/longnum.ts`, `dkg-long`); `docs/identifiants-longs.md`, rapport `docs/rapports/identifiants-longs-intacts.md`
- [x] Correction: npm test (2293 ok) + tsc verts; captures des rapports decimal-exact, identifiants-longs, plages-tronquees, statistiques-selection, tableaux-croises listees en chemins complets (les noms nus n etaient pas trouves par `validateReport`)
- [x] formules-portables-entre-langues-et-separateurs : formule stockée en syntaxe canonique, affichée et saisie avec `;` et `,` en langue fr (`engine/locale.ts`, `ui/formula/syntax.ts`, barre de formule, éditeur); `docs/formules-portables.md`, rapport `docs/rapports/formules-portables-entre-langues-et-separateurs.md`
