# Rapport : Atteindre : formules / constantes
Statut : termine
Visible : oui

## Fait
- La fonctionnalité était absente : implémentée en TDD (tests rouges puis verts).
- `src/engine/audit-kinds.ts` (`rawKind`), `src/ui/grid/kinds.ts` (bascule `dk-kinds`), `src/ui/grid/cellkind.ts` (`markKind` : `dkg-kf` / `dkg-kc`), `src/ui/grid/grid.ts` (type dans le signal de rendu), `grid.css` (couleurs via tokens, clair + sombre).
- Commande palette `view.kinds` (`src/ui/commands.ts`) + entrée menu Affichage (`src/ui/menubar/spec.ts`).
- Tests : `src/engine/audit-kinds.test.ts`, `src/ui/grid/kindsView.test.ts`, e2e `e2e/feat-formules-constantes.spec.ts`.
- Doc `docs/formules-constantes.md`, `TODO.md` coché, `CLAUDE.md` mis à jour.

## Non fait
- Pas de sélection des cellules (Atteindre spécial), pas de persistance de l'état.

## Preuves
- Tests : ok (2246 tests vitest, tsc propre, e2e formules-constantes 2/2)
- Captures : docs/screenshots/atteindre-formules-constantes/formules-clair.png, docs/screenshots/atteindre-formules-constantes/formules-sombre.png, docs/screenshots/atteindre-formules-constantes/avant-clair.png, docs/screenshots/atteindre-formules-constantes/avant-sombre.png

## Decisions
- Formule = bleu doux (`--c-accent-soft-2`), constante numérique = `--c-error` 18 % (valeur en dur = anomalie potentielle); texte et vide non colorés.
- Bascule non persistante, entrée unique palette + Affichage.
