# Handoff dk-table

Date : 2026-10-24. Branche `master` @ `187ee7e`. Repo https://github.com/delikesance/dk-table.git (privé), pas de push en attente demandé.

## 1. Projet

- **dk-table** : hackathon "War of Code : le Tableur" (tableur type Excel, livré avant minuit).
- Règles : l'app n'embarque AUCUNE IA ; recalcul auto des dépendants ; installable Windows + Linux ; notation pairs /10 (beauté, praticité, légèreté, facilité) ; bonus +5 "Pépite" ; démo 5 min (installation puis tour des fonctions).
- Stack : Tauri v2 (Rust) + Vite TypeScript vanilla.
- Pépite retenue : **cellules vivantes** (`SPARKLINE`, `BAR`, `TREND`). Pépites 1 (flèches) et 2 (voyage dans le temps) : écartées, bonus éventuels.

## 2. État

- `master` = `187ee7e`.
- 788 tests unitaires OK (`npm test`), `npx tsc --noEmit` et `npm run build` verts.
- e2e : 206 passés + 1 skipped (`npm run test:e2e`, Playwright, port Vite aléatoire par run).
- Dev server 1420 : peut tourner, ne pas le tuer, ne pas changer de branche dans le dépôt principal.

## 3. Fait

- Vague 1 (22 branches) : fonctions `engine/fn-*`, `wire.ts`, `fndocs`, dates convention 1900.
- `engine-matrix-na` : plages 2D, `#N/A`, `IFNA`.
- `style-textcolor` : `CellStyle.color` (hex).
- `lane-grid` : largeur des colonnes, Ctrl+D / Ctrl+R, filtre par colonne (en vue).
- `lane-files` : menu Fichier unique, toasts, autosave 1 s.
- `lane-toolbar` : barre de base N1 visible, couleur de fond, mini-barre flottante multi-cellules, Σ (Alt+=), tri.
- `wire-fixes` : couleur de texte, Récents, Ctrl+X, focus zone de nom, bouton fond de la mini-barre.
- e2e : engine / edit / shell / feat-* ; hook `globalThis.__DK_IO__` pour injecter l'E/S.
- `docs/benchmark-captures.md` fusionné.

## 4. Restant (code)

- Ctrl+D ne décale pas les références relatives (test `fixme` dans `e2e/feat-fill.spec.ts`).
- Réconcilier `TODO.md` et `CLAUDE.md` :
  - limites connues obsolètes : couleur de texte, `#N/A`, lookups 2D ;
  - « Nombre brut non formaté fr-FR par défaut » : à décider.
- Nettoyage worktrees/branches fusionnés :
  - supprimer `wt/*` fusionnés et `worktree-agent-*` ;
  - GARDER `wt/redesign-a-inspecteur`, `wt/redesign-b-compact`, `wt/redesign-c-flottant` (non fusionnés).
- `node_modules` en jonction dans une worktree : supprimer avec `cmd /c rmdir` (jamais `rm -rf`).

## 5. Décisions en attente (utilisateur)

- Direction du redesign : hybride proposé sur C :
  - barre de titre + Ctrl+K ;
  - mini-barre flottante ;
  - barre de formule compacte de B ;
  - inspecteur A optionnel ;
  - corrections du reviewer listées dans `mockups/redesign/`.
- Barre de base visible à l'arrivée vs feuille seule (contredit la consigne initiale).
- Format fr-FR des nombres bruts.

## 6. Manuel

- Vérif visuelle Tauri clair/sombre + grille virtualisée.
- CI GitHub : `gh run view 40112430388`.
- Répétition de la démo (`docs/demo.md`).
- Icône finale (placeholder actuel).
- Test de l'installeur Windows (MSI/NSIS).
- `release.yml` via workflow_dispatch (Linux deb + AppImage).
- Pépites 1/2 (optionnelles).
- T4.1 : confirmer "Libre Fiscal" = LibreOffice Calc.

## 7. Défauts appliqués

- Pas de F4, pas de poignée de recopie.
- Filtre = vue (ne modifie pas les données).
- Tri déplace les lignes entières.
- Σ : somme au-dessus, sinon à gauche.
- Autosave 1000 ms, seulement si chemin connu + document modifié.

## 8. Limites connues

- `MAX_ROWS` = 1000.
- Popover de filtre : 200 valeurs max.
- Filtre et largeurs de colonnes non persistés dans `.dktable`.
- Masque de filtre calculé à l'application (pas recalculé sur édition).
- Mini-barre flottante : sélection multi-cellules seulement.
- Flush autosave à la fermeture : au mieux.
- Rendu live : seulement `=SPARKLINE|BAR|TREND(...)` en cellule entière.

## 9. Règles de travail

- Orchestrateur pur : tout est délégué (scout / worker / reviewer) ; le thread principal n'édite pas.
- Workers en worktree `wt/<nom>`, branche dédiée, commits petits.
- TDD : test rouge d'abord ; brief avec commande de test (`npm test`, `cargo test` si Rust).
- Fichiers ≤ 200 lignes (sauf maquettes `mockups/pepite-1-*`, `pepite-2-*`).
- Doc de chaque module/fonction ; `TODO.md` à jour dans le même commit.
- Intégration : fusion dans `integration`, `npm test` + `npx tsc --noEmit` verts, puis `master`.
- Pas de push sans demande explicite.
- Worktree + vitest : si "Denied ID" sur `node_modules/iconoir`, `npm install` dans la worktree.
