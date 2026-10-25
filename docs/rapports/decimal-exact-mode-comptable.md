# Rapport : Décimal exact (mode comptable)
Statut : termine
Visible : oui

## Fait
- `engine/decimal.ts`, evaluator `fix`, champ `.dktable` `decimal`, case dans Paramètres, recalcul au changement, coin orange + infobulle (`dkg-gap`), docs/decimal-exact.md.

## Non fait
- Le design `docs/design/2026-10-25-180012.html` ne couvre pas cette fonctionnalité (aucune mention écart/décimal); conformité non vérifiable, UI alignée sur les tokens existants (`--c-error`, Paramètres).

## Preuves
- Tests : ok (`npm test` : 307 fichiers passés + 4 ignorés; 2240 tests passés, 4 ignorés; `npx tsc --noEmit` sans erreur)
- E2E : `npm run test:e2e -- feat-decimal` : 2 passed (clair 655ms, sombre 604ms)
- Captures : docs/screenshots/decimal-exact-mode-comptable/option-clair.png, docs/screenshots/decimal-exact-mode-comptable/option-sombre.png, docs/screenshots/decimal-exact-mode-comptable/ecart-clair.png, docs/screenshots/decimal-exact-mode-comptable/ecart-sombre.png

## Decisions
- Pas de lib : arrondi à 15 chiffres significatifs après + - * / ^ (0,1+0,2 = 0,3), suffisant en décimal comptable.
- Option par classeur (`decimal?: boolean` dans `.dktable`), état moteur `engine/decimal.ts`.
- Écart « affiché ≠ stocké » : formats number/currency/accounting (2 déc.) et percent ; cellule marquée `data-gap` + titre.
