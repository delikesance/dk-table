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

- [x] T1.1 Init Tauri v2 + Vite TypeScript vanilla
- [x] T1.2 Structure `src/`, `src-tauri/`, `src/engine/`, `src/ui/` (après T1.1)
- [x] T1.3 Fenêtre principale dk-table 1200x800 (après T1.1)
- [x] T1.4 Plugin dialog (après T1.1)
- [x] T1.5 Plugin fs, permissions minimales (après T1.1)
- [x] T1.6 `npm run tauri dev` OK (après T1.2 à T1.5)
- [x] T1.7 Premier `tauri build` OK (MSI 3.1 MiB + NSIS 2.06 MiB, `src-tauri/target/release/bundle/`)

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
- [x] workflow-ux : doc `docs/workflow-ux.md` écrit (benchmark, N1/N2/N3, clics, 12 changements, décisions) + `src/config/workflowUx.test.ts`
- [ ] workflow-ux : planifier les changements du doc §4 (barre N1 visible, Σ, tri, menu Fichier unique, toast, couleurs, filtre, redim., autosave, Ctrl+D/R, mini-barre, format Date) ; trancher les décisions §5

P1 : qualité visible (beauté, praticité)
- [x] Corriger les alertes hooks design (contraste, taille min) : fait (contraste-design, `src/styles/styles.test.ts`)
- [ ] Icône d'application définitive (placeholder aujourd'hui)
- [x] Formule vivante : tests de verrouillage seulement (`live.test.ts`) ; SVG en formule composée non supporté par le moteur texte/nombre (reste cellule entière)
- [x] Fichiers récents persistés (`src/io/recents.ts`, localStorage) ; reste : scope fs Tauri adapté

P2 : perf et fonctions
- [x] Perf grille : rendu incrémental (écritures DOM évitées si inchangé) ; limite : renderCell/getDisplay toujours appelés pour 2600 cellules
- [x] Perf grille : virtualisation (`perf-grid-virtual`, MAX_ROWS=1000) ; reste : rendu à vérifier à la main
- [x] Fonctions : fn-math/text/logic/date/finance/cond/iferror câblées (`engine/wire.ts`), fn-lookup partiel (2D à venir), engine-range, engine-sort
- [ ] Autres features selon priorités de `docs/recherche-tableur.md`
- [x] Split de `app.ts` en `appState/appGrid/appApi/appWidgets` (split-app) ; contrôle > 200 lignes à refaire à chaque vague

P3 : livraison
- [x] Packaging Linux config (deb + AppImage, `release.yml`, `src/config/packaging.test.ts`) ; reste : valider `release.yml` via workflow_dispatch sur GitHub
- [ ] Test de l'installeur Windows (MSI/NSIS construits en T1.7)
- [ ] T4.1 Analyser LibreOffice Calc via REA, sans copier de code (optionnel ; "Libre Fiscal" à confirmer)
- [ ] T5.2 Mettre à jour CLAUDE.md (commandes build/test, état réel : section Status encore "no app code")
- [ ] Décision pépites 1 (flèches) / 2 (voyage dans le temps) : abandon ou bonus si le temps le permet

## Phase 8 : Modules intégrés, câblage à faire

- [x] Modules sans câblage UI : wf-sort-model (tri), toast, colors, floating (mini-barre), filter-logic, autosave-logic
- [x] numfmt-date (format Date), alignement `DATE`/`YEAR`/`MONTH`/`DAY`/`serialToISO` sur la convention 1900 de `numfmt.ts`
- [x] Tests unitaires ajoutés : engine-functions, ui-cellview-model, ui-palette-formulabar, ui-app-api-state, `functions.wired.test.ts`, `dateConsistency.test.ts`
- [ ] engine-matrix-na : plages 2D dans l'évaluateur (VLOOKUP, HLOOKUP, INDEX 2D : 3 `it.todo` dans `functions.wired.test.ts`) + code `#N/A` (IFNA, lookups)
- [ ] style-textcolor : `CellStyle.color` (couleur du texte) manquant
- [ ] Câblage UI : barre N1, Σ, tri, filtre, couleurs, mini-barre flottante, toast, autosave
- [ ] Câblage UI : menu Fichier unique, largeur de colonnes, Ctrl+D / Ctrl+R
- [ ] Tests e2e par fonctionnalité (worktree `e2e-playwright-setup` en cours)

## Later (non planifié)

- [x] Macros Lua (wasmoon) : API cellules, délai max, palette « Exécuter une macro Lua… », undo en un pas (branche `wt/lua-macros`)
- [ ] Macros : enregistrer/réutiliser des scripts, accès aux styles et à plusieurs feuilles

- [x] Moteur de recalcul (graphe de dépendances, #CYCLE) : fait (I1)
- [x] Pépite Cellules vivantes (SPARKLINE/BAR/TREND) : fait (I6 + I8)

## E2E (Playwright)

- [x] Infra e2e : `playwright.config.ts`, `e2e/helpers.ts`, `e2e/smoke.spec.ts`, job CI
- [ ] Tests e2e par fonctionnalité à écrire (édition, formules, undo/redo, CSV, onglets, palette, cellules vivantes)

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

## Refonte visuelle UI (revue 1re phase, branche wt/ui-review)

Captures: scratchpad de session (light/dark, 1200x800). Revue faite sur l'arbre principal (plus récent que ce worktree). Aucune modif de style en phase 1.
Direction: sobre, contrasté, encre indigo; deltas tokens: `--c-line` .09 -> .14 (clair) / .10 -> .16 (sombre); `--c-text-3` -> >= 5:1 sur surface-2; `--c-accent-soft` .10 -> .14; barre active de la toolbar = trait 2px accent (pas de bandeau plein); `--r-md` 10 -> 8, `--r-lg` 14 -> 12; `--sh-2` plus net (0 6px 20px .14 + 0 0 0 .5px); `--fs-md` 13 -> 13.5 cellules; icônes 18 -> 20px (variantes redesign); en-têtes col/ligne `--fw-medium` + `--c-text-2`.
Chaque tâche: écrire d'abord le test de rendu (vitest/jsdom, lecture CSS/styles calculés) puis le style.

Classement par gravité (P0 = pire)
- [ ] P0 Grille: nombres alignés à gauche (cellule `display:flex` => `text-align` sans effet, voir `grid.css` `.dkg-cell`). Test: `src/ui/cellview.test.ts` cellule numérique => `justify-content:flex-end`; texte => start; erreurs `#CYCLE!/#DIV/0!` centrées/en `--c-error`. Fichiers: `cellview.ts`, `grid/grid.css`.
- [ ] P0 Grille: erreurs (#CYCLE!, #DIV/0!) sans couleur (texte normal). Test: classe `dk-cell--error` => `color:var(--c-error)` + fond `--c-error-soft`. `cellview.ts`, `grid.css`.
- [x] P1 Toolbar: bouton « Fichier » = pilule blanche ~220px (flash en sombre), hors échelle; la barre saute de ~2px au toggle. Test: `styles.test.ts` `.dk-toolbar` hauteur stable (`--toolbar-h`) minimal vs ouvert; menu Fichier largeur <= 96px, fond `--c-surface-2`. `toolbar/menus.ts`, `components.css`.
- [x] P1 Toolbar: pas de hiérarchie (tout gris, séparateurs faibles, filet accent 2px sous la barre trop prégnant). Test: `.dk-iconbtn--active` contraste >= 3:1; séparateur `--c-line-strong`. `components.css`, `tokens.css`.
- [x] P1 Sidebar: 3 sections identiques (titres 11px gris `--c-text-3`, faibles), liste fonctions = mono + signature gris clair peu lisible, panneau « Cellule » sans cadre. Test: contraste titres >= 4.5:1; `.dk-item__meta` >= 4.5:1; lignes fonctions 28px. `sidebar/`, `components.css`.
- [ ] P1 Cellule active / sélection: anneau 2px sans cran (identité DESIGN.md), plage sélectionnée à peine visible en sombre. Test: `.dkg-active::after` cran 6px accent; `.dkg-range` alpha >= .14. `grid.css`.
- [ ] P2 Grille: lignes `--c-line` trop faibles en sombre, en-têtes sans hiérarchie, ligne 1 sans repère d'en-tête; barre de défilement/ligne 23 coupée. Test: contraste ligne/surface >= 1.3:1; en-têtes `--fw-medium`. `grid.css`, `tokens.css`.
- [x] P2 Barre de formule: nom de cellule (« B3 ») isolé, `fx` gris, chevron outils ambigu (sans libellé/infobulle visible), pas de séparation avec la toolbar. Test: `.dk-formula` hauteur `--formula-h`, bordure basse `--c-line`; bouton toggle `aria-label` + `title`. `components.css`, `appTools.ts`.
- [ ] P2 Palette Ctrl+K: sélection pleine accent très saturée (clair), badge `Ctrl+O` bordure noire en sombre, liste coupée net en bas, pas de groupes/icônes. Test: item sélectionné = `--c-accent-soft` + texte `--c-text`; badge `.dk-kbd` bordure `--c-line-strong`; `max-height` + fondu bas. `palette/palette.css`.
- [ ] P2 Popover de filtre: compteurs gris à droite peu lisibles, cases natives (bleu système, hors accent), « (Vides) 994 » bruit, boutons sans hiérarchie. Test: `accent-color:var(--c-accent)`; (Vides) en dernier + `--c-text-3`; bouton OK `.dk-btn--primary`. `grid/filterPopover.ts`, `grid.css`.
- [x] P3 Onglets: onglet actif = pilule discrète, « + » minuscule, onglets inactifs `--c-text-3`; bandeau de pied sans séparateur marqué. Test: onglet actif `--c-surface` + trait accent 2px bas; cible « + » >= 24px. `tabs/tabs.css`.
- [ ] P3 Menu contextuel: non capturé par script (ouverture via clic droit réel requise): à vérifier à la revue (ombre `--sh-2`, rayon `--r-md`, danger rouge). `contextmenu/contextmenu.css`.
- [ ] P3 Toasts/statut: non visibles dans les captures (aucun message déclenché); vérifier position/contraste (`toast/`). Test: toast `role=status`, fond `--c-overlay` contraste >= 4.5:1.
- [ ] P3 Cellules vivantes: sparkline fine (1px) et barres sans marge, TREND rouge seul sans contexte; en sombre barres pâles saturées. Test: `engine/live` SVG `stroke-width>=1.5`, `gap` barres >= 1px, couleurs via `--c-accent`/`--c-error`. `live/*.ts`.
