# Tests e2e de la Boucle

Couvrent la Boucle de bout en bout sans jeton OAuth ni réseau : **vrai serveur** (`buildBoucleServer`), **vrai git** (dépôt temporaire + distant bare, worktrees, fusions, push), **vrai navigateur** Playwright sur les trois pages (panneau, moodboard, design). Seuls le modèle (faux agents) et `npm ci` / `npm test` / `npx tsc` (factices, configurables) sont simulés.

## Lancer

```
npx playwright install chromium     # une fois
npx playwright test e2e/boucle      # ou npm run test:e2e (toute la suite)
BOUCLE_SHOTS=1 npx playwright test e2e/boucle   # réécrit docs/screenshots/boucle-e2e/ (clair + sombre)
```

## Contenu

- `e2e/boucle/repo.ts` : `makeRepo(idées)` (master + origin bare + synthèse de recherche), `sh`.
- `e2e/boucle/fakeAgent.ts` : `fakeQuery(script)` écrit de vrais fichiers dans le worktree de l'agent; comportement par carte et par essai (`done`, `wip`, `blocked`, `no-shot`, `none`), porte (`gate`) pour figer un agent, coût borné par `maxBudgetUsd`, abandon (`abortController`) comme le SDK.
- `e2e/boucle/harness.ts` : `startBoucle({ ideas, script, checks, env, repo })` -> `{ base, repo, events, go, stop, waitDone, dropConnections, close }` (client SSE de référence avec `Last-Event-ID`).
- `e2e/boucle/pages.ts` : `openPages` (3 onglets), `column`, `shoot`.
- Specs : `boucle-global` (run complet, budget, arrêt/reprise), `boucle-panel` (conflit réessayé, nouveau run, Stop, coupure SSE), `boucle-git` (push, conflit avec origin, worktrees), `boucle-design` (toile, frise, design non fusionné).

## Bugs trouvés puis corrigés

| Bug | Correctif |
| --- | --- |
| Conflit de fusion réessayé avec succès : phase « Implémentation » restait en échec | `panel.js` : l'agent de reprise remplace les agents échoués dont il reprend les cartes |
| Un nouveau run additionnait coûts et états du précédent | `panel.js` : remise à zéro au premier événement d'un nouveau run |
| Stop sans retour visible | « Arrêt en cours… », bouton bloqué jusqu'à `done` |
| Coupure du flux en plein run : journal et coûts doublés | `server.ts` : ids SSE `<run>-<rang>`, reprise par `Last-Event-ID`; `panel.js` : autre run = remise à zéro |
| Worktrees (avec `npm ci`) des agents non fusionnés jamais retirés | `git.ts` `release` (branche gardée, supprimée si vide; jamais si le commit a échoué) |
| Frise du designer sans « Fichier écrit » si l'agent finit juste après l'écriture | `designs.ts` `watchDesigns(...).flush()` avant l'arrêt du watcher |

Non traités ici (autre fil) : doublons de cartes (même titre dans deux axes, idée retitrée), bruit du journal, temps réel du moodboard.
