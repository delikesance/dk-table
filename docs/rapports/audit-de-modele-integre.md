# Rapport : Audit de modèle intégré
Statut : termine
Visible : oui

## Fait
- Moteur pur `src/engine/model/audit.ts` (`auditModel(doc)`, déjà présent + `audit.test.ts` : constantes, incohérences, plages ratées, volatiles, cycles).
- Panneau `src/ui/dialogs/audit.ts` (`renderAudit`, `openAudit`) : constats groupés par type avec compte, clic = feuille + cellule.
- Commande palette `data.audit` « Audit de modèle » (`src/ui/commands.ts`), styles `dataDialogs.css`.
- Tests : `src/ui/dialogs/audit.test.ts`, `src/ui/commandsAudit.test.ts` (rouges d'abord), e2e `e2e/feat-audit.spec.ts`.
- TODO.md coché.

## Non fait
- Design `docs/design/2026-10-25-180012.html` ne décrit pas cette carte (Espion): repli sur le rapport et TODO.
- Pas d'ignorer/persistance des constats, pas de correction automatique.

## Preuves
- Tests : ok (2217 tests vitest, tsc propre, e2e feat-audit 2/2)
- Captures : docs/screenshots/audit-de-modele-integre/panneau-clair.png, docs/screenshots/audit-de-modele-integre/panneau-sombre.png

## Decisions
- Point d'entrée = palette Ctrl+K (comme depmap), pas de bouton en double.
