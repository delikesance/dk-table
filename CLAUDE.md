# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development methodology: TDD

- The project follows test-driven development: write tests first (red), implement (green), then refactor.
- No feature or fix is implemented before a failing test exists for it.
- Every worker brief must include the test command and the test to write first.
- CI (`.github/workflows/ci.yml`) runs tests on every push/PR and must stay green.
- Dev environment is containerized (`Dockerfile` + `docker-compose.yml`, service `dev`).

## To-do list

- `TODO.md` (repo root) is the source of truth for tasks.
- It MUST be updated on every task change (added, started, done, blocked, reprioritized), in the same change/commit as the work.

## Dev environment

- `Dockerfile`: node:22-bookworm + Rust + Tauri v2 Linux deps. `docker-compose.yml`: service `dev`. `.dockerignore` present.
- Docker Desktop NOT installed yet on the dev machine: run in an elevated PowerShell `winget install -e --id Docker.DockerDesktop`, then reboot/launch once (WSL2 backend).
- Images and CI not yet validated.

## CI

- `.github/workflows/ci.yml` (GitHub Actions, on push + PR): `npm ci`, `npm test`, `cargo test`, each guarded by file existence.

## Research

- `docs/recherche-tableur.md`: synthesis of spreadsheet features (with priorities) and UX click-reduction rules.
- Source gaps noted there: no LibreOffice / Apple HIG / Material source; some items marked "[Pratique]" or unsourced.

## Design

- Reference design = `mockups/design/` (`tokens.css`, `components.css`, `composants.html`, `DESIGN.md`): Apple-like, sober, "ink" indigo accent, system font stack, light + dark.
- Claude Design artifact: https://claude.ai/artifact/LKoJNjWKUAoJncBU8yt7gK (10 artboards: components + screens, uses Geist). NOT aligned with `mockups/design/`: `mockups/design/` wins, use the system font stack.
- The 3 pépite mockups (`pepite-1/2/3` HTML) are still only in `.claude/worktrees/` (not versioned).

## Status

**Project**: dk-table = entry for hackathon "War of Code : le Tableur" (build an Excel-like spreadsheet by midnight; AI may write the code but the app must NOT embed AI; auto-recalc of dependents mandatory; installable on Windows + Linux; scored by peers /10 on beauty, practicality, lightness, ease of use; +5 "Pépite" bonus for an original feature; 5-min demo: install then feature tour). Repo still has no app code; mockups not yet copied to `mockups/` (worktree paths below break if cleaned).

**Decisions (user-confirmed)**: stack = Tauri/Rust + web front; time budget = until midnight (not 4h); chosen Pépite direction = "Cellules vivantes".

**Pépites brainstormed** (HTML mockups, untracked, in worktrees, may be cleaned up; none browser-tested):
1. Flèches de dépendances vivantes: animated SVG arrows between precedents (blue) and dependents (orange) on hover, animated recalc propagation. Not chosen / set aside (to confirm if kept as secondary). Mockup: `.claude/worktrees/agent-a220bdbac1ec3fe0c/mockups/pepite-1-fleches.html`
2. Voyage dans le temps: change journal + timeline slider + compare two states. Not chosen / set aside (only if time remains; to confirm). Mockup: `.claude/worktrees/agent-a3096cddee133fef6/mockups/pepite-2-voyage-temps.html`
3. **Cellules vivantes (CHOSEN)**: in-cell mini-charts via SPARKLINE(range), BAR(range), TREND(range) (curve, mini-bars, colored arrow + %); redraw on edit. Mockup: `.claude/worktrees/agent-a1707b4d95697eb6b/mockups/pepite-3-cellules-vivantes.html`

**Open / to confirm**:
- Spreadsheet feature scope (formulas, functions list, undo/redo, CSV import/export, formats)
- Cycle handling (#CYCLE)
- Linux packaging format
- Whether pépites 1/2 are dropped or kept as stretch
