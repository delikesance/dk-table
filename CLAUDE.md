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

- `npm test` (vitest, jsdom pour l'UI), `npx tsc --noEmit`, `npm run build` (tsc + vite), `npm run tauri dev`.

## Structure (src/)

- `engine/`: modèle + recalcul (`sheet.ts` API publique: createSheet/setCell/getRaw/getValue/getDisplay/getRangeValues/registerFunction). `engine/live/`: mini-charts SVG purs + `adapter.ts` (registerLive: texte de repli dans le moteur; `liveResult(raw, range)`: `{kind:'html'}` pour la cellule).
- `io/`: format `.dktable` (`format.ts`), CSV (`csv.ts`), dialogues/fs Tauri (`files.ts`, deps injectables).
- `ui/`: `app.ts` (mount, câblage), `appTypes.ts` (interface App), `appState.ts`, `appGrid.ts`, `appApi.ts`, `appWidgets.ts` (modules issus du split de app.ts), `model.ts` (feuilles, styles, undo/redo par snapshots), `cellview.ts` (styles + rendu live), `commands.ts` (palette, raccourcis Ctrl+Z/Y/B/I/O/S/N, menu contextuel), `fileops.ts`, `fndocs.ts`; sous-dossiers `grid/ toolbar/ tabs/ sidebar/ palette/ contextmenu/`.
- `styles/`: `tokens.css` + `components.css` copiés de `mockups/design/` (la source de design reste `mockups/design/`; resynchroniser à la main).

## Decisions (intégration I8)

- Cellules vivantes: le moteur ne gère que des valeurs texte/nombre; `liveResult` détecte `=SPARKLINE|BAR|TREND(plage)` pleine cellule et la grille (hook `renderCell`) affiche le SVG. Le moteur renvoie un texte de repli (ex. TREND: "▲ +10%").
- Undo/redo: snapshot des cellules brutes par feuille (100 max); les éditions groupées (coller/effacer) = un pas. Styles non annulables ni persistés.
- Recalcul UI: après chaque édition, `grid.refresh()` complet (26x100).

## Research

- `docs/recherche-tableur.md`: synthesis of spreadsheet features (with priorities) and UX click-reduction rules.
- Source gaps noted there: no LibreOffice / Apple HIG / Material source; some items marked "[Pratique]" or unsourced.

## Design

- Reference design = `mockups/design/` (`tokens.css`, `components.css`, `composants.html`, `DESIGN.md`): Apple-like, sober, "ink" indigo accent, system font stack, light + dark.
- Claude Design artifact: https://claude.ai/artifact/LKoJNjWKUAoJncBU8yt7gK (10 artboards: components + screens, uses Geist). NOT aligned with `mockups/design/`: `mockups/design/` wins, use the system font stack.
- The 3 pépite mockups live in `mockups/` (`pepite-1-fleches.html` 325 lines, `pepite-2-voyage-temps.html` 341, `pepite-3-cellules-vivantes.html` 191).
- Exemption to the 200-line rule: mockups only (pepite-1 and pepite-2 exceed 200, not split). App code stays ≤200.

## Status

**Project**: dk-table = entry for hackathon "War of Code : le Tableur" (build an Excel-like spreadsheet by midnight; AI may write the code but the app must NOT embed AI; auto-recalc of dependents mandatory; installable on Windows + Linux; scored by peers /10 on beauty, practicality, lightness, ease of use; +5 "Pépite" bonus for an original feature; 5-min demo: install then feature tour). Repo still has no app code.

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

## Commands & structure

- `npm test` (vitest run), `cargo test` (in `src-tauri/`), `npm run tauri dev`, `npm run tauri build` (MSI + NSIS in `src-tauri/target/release/bundle/`).
- `src/engine/` (pure logic, e.g. `sheet.ts` + tests), `src/ui/` (DOM), `src/main.ts` (entry), `src-tauri/` (Rust, `lib.rs` registers plugins dialog + fs).
- Window 1200x800 "dk-table", id `com.delikesance.dktable`; capabilities in `src-tauri/capabilities/default.json` (dialog open/save, fs read/write text file only).
- `src-tauri/icons/` = placeholder flat icon, to replace.
