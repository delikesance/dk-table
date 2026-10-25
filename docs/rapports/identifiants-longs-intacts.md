# Rapport : Identifiants longs intacts
Statut : termine
Visible : oui

## Fait
- `engine/longnum.ts` (`isLongNumber`), `literal` stocke en texte exact, `rawKind` = `long`, classe `dkg-long` + infobulle, doc `docs/identifiants-longs.md`.

## Non fait
- Le design `docs/design/2026-10-25-180012.html` (validation/espion) est hors sujet; conformité non vérifiable.
- `=A1+1` sur un identifiant long : coercition numérique habituelle (non modifiée).

## Preuves
- Tests : ok (`npm test` : 2268 tests passés, 4 ignorés; `npx tsc --noEmit` sans erreur)
- E2E : `npm run test:e2e -- feat-identifiants-longs` : 2 passed
- Captures : docs/screenshots/identifiants-longs-intacts/entree-longue-clair.png, docs/screenshots/identifiants-longs-intacts/entree-longue-sombre.png

## Decisions
- Pas de trancheur : choix évidents. Détection pure sans exposant; passage par `rawKind` (pas de nouveau hook dans `grid.ts`, déjà à 200 lignes).
- Design `2026-10-25-180012.html` ignoré (autre sujet).
