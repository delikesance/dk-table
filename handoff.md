# Handoff dk-table

Date : 2026-10-24. Branche `master`. Modules I1 à I8 intégrés et commités (`5989dda`).

## 1. Projet

- **dk-table** : participation au hackathon "War of Code : le Tableur".
- Objectif : tableur type Excel, livré avant minuit.
- Règles clés :
  - L'IA peut écrire le code, mais l'app n'embarque AUCUNE IA.
  - Recalcul automatique des dépendants obligatoire.
  - Installable sur Windows + Linux.
  - Notation par les pairs /10 : beauté, praticité, légèreté, facilité d'usage.
  - Bonus +5 "Pépite" pour une fonctionnalité originale.
  - Démo de 5 min : installation puis tour des fonctionnalités.
- Stack : Tauri v2 (Rust) + Vite TypeScript vanilla.
- Pépite retenue : **cellules vivantes**, `SPARKLINE(range)`, `BAR(range)`, `TREND(range)`.
- Pépites 1 (flèches) et 2 (voyage dans le temps) : écartées, éventuels bonus (à confirmer).

## 2. État git

- Branche `master`, repo https://github.com/delikesance/dk-table.git (privé).
- Derniers commits :
  - `5989dda` Integrate engine, grid, toolbar, sidebar, palette, live cells and file IO (I1-I8)
  - `97dfa55` Add Tauri v2 + Vite skeleton with engine smoke test
  - `2079e99` Add dev environment, CI, research, design system and project docs
- CI : run 40111565384 (97dfa55) = success. Résultat du run suivant (push de `5989dda` + commit handoff) : à consulter via `gh run list --limit 1`.
- Vérifié avant commit : `npm test` 35 fichiers / 233 tests OK, `npx tsc --noEmit` OK, `TODO.md` I1 à I8 cochés (conforme).
- Worktrees `.claude/worktrees/agent-*` (10) : contenu déjà dans master, supprimés avec leurs branches `worktree-agent-*`.

## 3. Fait

- Docker validé, CI épinglée `ubuntu-24.04`, squelette Tauri (MSI 3,1 Mo + NSIS 2,1 Mo, icône placeholder).
- Maquettes dans `mockups/`.
- Moteur : parser, évaluateur, recalcul, `#CYCLE!`, fonctions.
- Cellules vivantes SPARKLINE/BAR/TREND (`src/engine/live/`) branchées au rendu.
- E/S : `.dktable` JSON + CSV (`src/io/`).
- UI : grille, barre d'outils + barre de formule, sidebar, onglets, palette Ctrl+K, menu contextuel.
- I8 : `src/ui/app.ts` intègre tous les modules.

## 4. Décisions

- Tauri/Rust + front web ; délai jusqu'à minuit.
- Design = `mockups/design/` + police système (pas Geist).
- Format document : JSON `.dktable` `{version:1,cells:{...}}`.
- Grille 26 x 100.
- TDD ; CI verte ; docs obligatoires ; fichiers max 200 lignes.
- `TODO.md` mis à jour à chaque changement de tâche, dans le même commit.

## 5. Lacunes connues

- Gras / italique / alignement / fond : ni persistés ni annulables (undo).
- Menu déroulant du format de nombre : inerte.
- Fichiers récents : mémoire seulement (perdus au redémarrage).
- Rendu live : seulement `=SPARKLINE|BAR|TREND(...)` en cellule entière (pas imbriqué dans une formule).
- Redessin complet de la grille à chaque édition (perf à surveiller).
- Aucune vérification visuelle réelle de l'UI faite (`npm run tauri dev` non inspecté).

## 6. À faire, dans l'ordre

1. Lancer l'app et valider visuellement (démo 5 min).
2. Corriger les lacunes ci-dessus (persistance du style + undo, format de nombre, fichiers récents).
3. Rendu incrémental de la grille.
4. Revue (reviewer) des modules ; contrôle des fichiers > 200 lignes (`src/ui/app.ts` ~195).
5. Phases 2 à 5 de `TODO.md` : tableur de base, documents, inspiration, vérification.
6. Packaging Windows (MSI/NSIS OK) + Linux (AppImage/deb) ; icône finale.

## 7. Points ouverts et pièges

- Périmètre non tranché : liste des fonctions, formats, packaging Linux.
- Hooks design impeccable : alertes low-contrast / tiny-text non traitées.
- "Libre Fiscal" = LibreOffice Calc à confirmer (T4.1).
- Dev server (`npm run tauri dev`, port 1420) : peut tourner, ne pas le tuer.
- Fichiers exemptés des 200 lignes : `mockups/pepite-1-fleches.html`, `mockups/pepite-2-voyage-temps.html`.
- Orchestrateur : tout est délégué via agents (scout / worker / reviewer) ; le thread principal n'édite pas.
- Ne rien commiter sans demande explicite.
