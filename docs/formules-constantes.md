# Surligner formules / constantes

Repère les valeurs en dur parmi les formules. Palette Ctrl+K « Surligner formules / constantes » ou menu Affichage (bascule, `view.kinds`).

- `src/engine/audit-kinds.ts` : `rawKind(raw)` -> `formula | number | text | empty` (préfixe `'` = texte).
- `src/ui/grid/cellkind.ts` `markKind` pose `dkg-kf` (formule) et `dkg-kc` (constante numérique) à chaque rendu; le signal de rendu inclut le type.
- `src/ui/grid/kinds.ts` : `toggleKinds()` bascule la classe `dk-kinds` sur `<html>`; `grid.css` ne colore que sous `.dk-kinds` (formule = `--c-accent-soft-2`, constante = `--c-error` à 18 %), donc clair et sombre.
- Non persistant (état d'affichage). Texte et vide non colorés.
- Tests : `audit-kinds.test.ts`, `grid/kindsView.test.ts`, e2e `e2e/feat-formules-constantes.spec.ts`.
