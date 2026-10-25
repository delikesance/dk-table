# Boucle : logique optimisée, cartes, rapports

La Boucle (`prototypes/oauth-sdk/`) est une interface pour Claude Code : elle lance des agents du SDK et
affiche ce qu'ils font. Elle ne doit ni les ralentir, ni changer leur comportement, ni les priver d'outils ou de skills.

## Conclusions de la recherche (SDK Claude Agent, TypeScript)

- Chaque `query()` lance un sous-processus CLI. Le coût fixe (démarrage) se paie à chaque appel : les appels
  « décoratifs » (résumés) coûtent donc autant de processus que de phases.
- `tools` accepte le preset `claude_code` (tous les outils); une liste fermée prive l'agent d'outils (Agent,
  Skill, WebFetch, MCP...). `skills: "all"` + `settingSources: ["user","project"]` donnent accès aux skills.
  `settingSources: []` coupe les skills : réservé aux appels sans outil.
- `disallowedTools` avec une règle précise (`Bash(git push:*)`) refuse dans tous les modes; `allowedTools`
  n'est qu'une pré-approbation. On interdit donc seulement git (la boucle gère branches et fusions) et
  `AskUserQuestion` (zéro question).
- `startup()`/`prewarm()` (alpha) garde un processus d'avance (~230-260 Mo chacun). **Non retenu** : API alpha,
  mémoire, gain limité face à des requêtes de plusieurs minutes. Repli sans effet de bord si on l'ajoute plus tard.
- `total_cost_usd` et `maxBudgetUsd` sont des estimations côté client : le budget partagé reste une borne douce.
- Cache de prompt de 5 min : les consignes stables (CLAUDE.md, preset système avec `excludeDynamicSections`) sont
  réutilisées d'une tournée à l'autre.

## Ce qui a changé

- `agentOptions.ts` : une seule source des options. Recherche et édition = preset complet, skills, sous-agent
  `trancheur` pour les doutes; seul l'appel « helper » est sans outil. Modèles par type de tâche (`MODEL_BY_KIND`).
- Résumés sans LLM par défaut (`llm: true` / `llmSummaries` pour les rédiger avec Haiku) : 0 processus au lieu de 4 par run.
- `mergeIfGreen` : `npm test` et `tsc` en parallèle.
- Serveur : `design.html`/`moodboard.html` + `*-view.js/css` servis en liste blanche; `GET /reports/<id>`, `GET /shots/<png>`;
  mémo de 2 s sur le board et la liste des designs (`memo.ts`); rafales d'événements regroupées côté client.

## Cartes, rapports, boucle jusqu'à tout fait

- Une carte = une idée du moodboard. États : idée, piste, en cours, preuves, terminée, bloquée (`card.ts`, `cards.ts`).
- Rapport `docs/rapports/<id>.md` écrit par l'agent dès le début (gabarit `reportTemplate`) : `Statut`, `Visible`,
  `## Fait`, `## Non fait`, `## Preuves` (`- Tests : ok (N)`, `- Captures : a.png, b.png`), `## Decisions`.
- Une carte n'est **terminée** que si `validateReport` passe : fait non vide, tests `ok`, captures existantes
  (sauf `Visible : non`). Un rapport « terminé » sans preuves reste en colonne Preuves.
- `pipeline.ts` : recherche, design, puis tournées implémentation + correction (lot de 3 cartes, `reportRules.ts`)
  jusqu'à ce que `allDone(board)` soit vrai; arrêt si budget épuisé, abandon, 12 tournées ou 2 tournées sans progrès.
  L'événement final porte `complete` (affiché par le panneau et le moodboard).
- Aucune question : l'agent délègue les doutes au sous-agent `trancheur` et note la décision.
- Direct : `reportWatch.ts` surveille `docs/rapports/` du worktree et émet `card`; le moodboard relit le rapport de la carte
  ouverte (tiroir). Lecture en couches worktree actif > arbre principal > `developpement` (`files.ts`).

## Mesures (même scénario avant/après)

| Mesure | Avant | Après |
|---|---|---|
| Processus Claude de résumé par run (4 phases) | 4 (+1 par lot de 8 cartes à chaque rafraîchissement du moodboard) | 0 |
| Page Design, 60 s de run, 10 designs, 80 événements : iframes créées | 1023 | 1 |
| Page Design, mêmes conditions : requêtes `/designs` | 93 | 33 |
| Page Moodboard, mêmes conditions : requêtes `/moodboard` | 21 | 13 (chacune sans LLM, mémo 2 s côté serveur) |
| Vérifs avant fusion (`npm test` 66,9 s, `tsc` 1,0 s sur ce dépôt) | 67,9 s en série | 66,5 s en parallèle (gain borné par le plus long) |

Le gain de la parallélisation est faible ici parce que `tsc` est très court; il grandit avec la durée de `tsc`.
Méthode : jsdom + minuteries simulées (60 s, 2 événements/s, un `summary` sur dix); anciennes pages = merge-base avec `developpement`.
Test de régression : `overhead.test.ts`.

## Captures

`docs/screenshots/boucle-board/` (clair et sombre) : `shots.board.fixture.test.ts` (vrai serveur, données de démonstration)
puis `shots.board.mjs`.

## Polices et connexion (correctif)

- Le panneau demandait Sofia Sans Extra Condensed, Inter Tight et DM Mono sans jamais les charger : rendu en police
  système. `fonts.css` + `fonts/*.woff2` (latin seulement) sont servis par `fontRoute.ts` (`/fonts/<nom>.woff2`, liste blanche), aucun réseau.
- `/events` envoie les en-têtes tout de suite et un `: ping` toutes les 15 s : sans historique, le navigateur restait en
  « connexion » puis affichait « Connexion perdue ».
- Captures avant/après : `docs/screenshots/boucle-polices/`.

## Run réel : échecs de fusion lisibles, journal propre

- L'échec « npm test failed » n'affichait que les 500 derniers caractères de la sortie (bilan de vitest, jamais le test rouge).
  `cleanOutput.ts` retire les codes ANSI et garde les lignes `FAIL`, `Error`, le bilan (`failureDigest`, 1500 caractères au plus) :
  le journal nomme maintenant le test qui échoue.
- Journal : un seul évènement par début/fin d'axe (la ligne `info` en double est supprimée, la fin porte coût et durée),
  plus de ligne `resume:` en double du résumé, codes ANSI retirés aussi côté panneau.
- Budget : `left()` = plafond − dépensé (ne saute plus quand les réservations en vol se libèrent), `cap()` = plafond; le résumé
  s'affiche en euros comme le panneau.
- Design non fusionné : son dossier reste exposé (worktree conservé), la page Design l'affiche au lieu de « Aucun design ».
- Preuve sans réseau : `shots.journal.mjs` (captures `docs/screenshots/boucle-run/`) et un run complet avec faux agent, vrai git
  et vrai `npm test` + `tsc` (recherche fusionnée dans `developpement`).

## Thème = celui de l'application

- Les trois pages (panneau, moodboard, toile design) chargent les tokens de l'app : `src/styles/tokens.css` (clair) et
  `theme-dark.css` (nuit), servis tels quels sous `/theme/` (`assets.ts`), puis `theme.js` qui pose `data-theme` (light|dark) selon le système.
- `panel.css` n'a plus que des alias (`--bg: var(--c-bg)`, `--acc: var(--c-accent)`…), les feuilles de page n'ont aucune couleur en dur
  (`theme.test.ts`, seul `#fff` reste : fond du design affiché). Polices, rayons, états (succès, erreur, dépendances) viennent aussi des tokens.
- Changer un token dans l'app change donc la Boucle. Captures avant/après : `docs/screenshots/boucle-theme/`.

## Comparaison avec l'application

Captures côte à côte (app à gauche, Boucle à droite, 1200x800) : `docs/screenshots/boucle-theme-app/app-vs-boucle-{clair,sombre}.png`. Tokens identiques (servis tels quels); la barre du haut reprend la barre de menus de l'app (Sofia Sans Extra Condensed, capitales). Un panneau lavande (#8c8cff) = ancien CSS d'avant #37 : relancer `boucle.ts` depuis `developpement` à jour.

## Windows (CRLF)

Un checkout Windows (autocrlf) livre les fichiers en `\r\n`. `.gitattributes` force `eol=lf`; les lecteurs de fichiers (`parseReport`, TODO, sorties git) acceptent `\r?\n`, et `designSkill.test.ts` normalise via `readLf`. Tests: `designSkill.test.ts` (CRLF), `card.test.ts` (rapport CRLF).

## Design absent de la toile (Windows)

Cause : avec `shell: true` (cmd.exe), Node ne protège pas les arguments. `git commit -m "Boucle: design"` arrivait coupé, git échouait (pathspec), rien n'était commité, la fusion ne fusionnait rien et `worktree remove --force` supprimait le design. Correctifs : `shellArgs.ts` (guillemets sous Windows, utilisé par `boucle.ts`), `git.ts` refuse de fusionner (et garde le worktree) si le commit a échoué ou si la branche n'a aucun commit d'avance. La toile affiche déjà le design le plus récent. Captures : `docs/screenshots/boucle-design-canvas/`.

## Cartes terminées durables

`doneLedger.ts` : registre append-only `.boucle/termines.jsonl` (ignoré par git) qui garde un instantané de chaque carte terminée et de son rapport. `buildBoard` y inscrit toute carte `termine` et la réaffiche toujours dans « Terminées », même si l'idée disparaît de `fonctionnalites.md`, si `TODO.md` passe à `[x]`, si le rapport est supprimé ou après un redémarrage; `cardDetail` relit le rapport depuis le registre. Les captures restent dans le dépôt (`docs/screenshots/`). Tests : `doneLedger.test.ts`, `doneLedger.server.test.ts`. Captures : `docs/screenshots/boucle-termines/`.
