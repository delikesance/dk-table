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
  `trancheur` pour les doutes; seul l'appel « helper » est sans outil. Modèles par type de tâche (`routing.ts`, une seule table).
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
- `pipeline.ts` : recherche, design, puis tournées implémentation + correction (lots de `BATCH` cartes, `rounds.ts`, consigne `reportRules.ts`)
  jusqu'à ce que `allDone(board)` soit vrai; arrêt si budget épuisé, abandon, `MAX_ROUNDS` tournées ou `PATIENCE` tournées sans progrès (valeurs ci-dessous).
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

## Boucle persistante (arrêt et reprise)

Cause de l'arrêt « sans progrès » avec 12 € de budget restant : le progrès ne comptait que les cartes passées en `termine`, le lot (3 cartes) était toujours le même et 2 tournées sans carte terminée arrêtaient tout, avec au plus 12 tournées (36 cartes pour 55) — valeurs d'alors, remplacées par celles de `limits.ts`. Sous Windows, les commits échouaient en plus (voir PR #40) : rien n'avançait.

`rounds.ts` : lots de 6 cartes, progrès = toute avancée d'état (idée → en cours → preuves → terminée), rotation (une carte sans progrès après 3 essais passe derrière les autres, puis est reprise), arrêt seulement si budget épuisé, abandon, 3 tournées de suite sans aucune avancée, ou 40 tournées. La raison (`reason` : `complete`, `budget`, `stuck`, `abort`, `max-rounds`) part dans les événements `info`/`done` et le panneau l'affiche (« Budget épuisé », « Bloquée », « Tournées max, cartes restantes »). Le résumé n'écrit « Boucle terminée » que si plus aucune carte ne reste. Les agents parallèles sont décrits plus bas. Captures : `docs/screenshots/boucle-arret/`.

## Flux de suivi, modèles minimaux, push auto

Maquette du flux : https://claude.ai/artifact/8eVb5xZRpYMELx3xQW9NVm.

**Réconciliateur** (`reconcile.ts`, pur, sans worktree) : l'état d'une carte est recalculé à chaque lecture du tableau. `en-cours` seulement si un agent du lot actif la traite (plus de déduction depuis une case ouverte du TODO); un rapport `en-cours` sans agent est orphelin (retour à `idee` + anomalie); une idée cochée au TODO sans rapport passe en `preuves` (manque `rapport`) au lieu de disparaître; `termine` = rapport `termine` + preuves valides, sinon `preuves` avec la liste de ce qui manque; une carte du registre reste `termine`. Les anomalies (`BoardCard.anomalies`) s'affichent en pastille sur la carte, en compteur dans l'en-tête du moodboard et en ligne `anomalies (N)` dans le journal de tournée. Tests : `reconcile.test.ts`, `moodboard.view.test.ts`.

**Validation par le code** : la correction (agent) ne tourne que si la fusion a été refusée (tests/tsc rouges) ou si une carte du lot est en `preuves`; sinon l'événement « correction ignorée : lot valide par le code » (aucun appel modèle). La tâche de correction cite les preuves manquantes exactes (`rounds.ts` `correctionTask`).

**Routage des modèles** (`routing.ts`, `ROUTES`) : le plus petit modèle d'abord, escalade à chaque échec de la carte. research/design : sonnet → opus; implémentation/correction : haiku → sonnet → opus; résumé : haiku; trancheur : haiku → sonnet. Surcharge : `BOUCLE_MODELS='{"implementation":["sonnet"]}'`. Poids relatifs (haiku 1, sonnet 3, opus 15) : estimation du coût, pas une facture (`costUnits`).

**Push automatique** (`git.ts` `pushDev`) : une fois par lot, après la suite complète verte (voir « Optimisation de la boucle »), `git push origin developpement:developpement`. Jamais master/main (refus si la branche courante n'est pas `developpement`); si le distant a avancé : `git pull --no-rebase`, conflit = abandon propre (`merge --abort`) + message dans le journal (« push non effectué : … »). Désactiver : `BOUCLE_PUSH=0`. Tests avec un vrai dépôt distant nu : `git.push.test.ts`; flux complet avec faux agents : `pipeline.flow.test.ts`.

**Limites** : coût comparé en unités relatives et en nombre d'appels sur faux agents, pas en euros réels; non vérifié sous Windows.

## Vérification avant fusion : référence à la base

Cause du refus de fusion de la recherche sous Windows : `git.push.test.ts` (vrais processus git) dépassait 5 s dans la suite complète, et ce test infrastructurel bloquait une carte sans rapport avec lui. Correctifs :

- **Tests git** (`git.push.test.ts`, `git.parallel.test.ts`) : délai de 60 s pour les vrais dépôts, `gc.auto=0` et `core.fsync=none`.
- **Échec préexistant** (`git.ts`, `testFailures.ts`) : si `npm test` est rouge dans le worktree, les seuls fichiers rouges sont relancés sur un worktree de référence (`developpement` détaché, créé une fois, retiré en fin de run). Un test déjà rouge sur la base ne bloque pas la fusion : il est listé dans `preexisting` et le journal affiche « anomalie : test(s) déjà rouge(s) sur developpement… ». Un test rouge seulement sur la branche, une sortie illisible ou `tsc` rouge bloquent toujours. Tests : `git.baseline.test.ts`, `testFailures.test.ts`, `pipeline.flow.test.ts`.
- **Fusion sérialisée** (préparation des agents en parallèle) : verrou FIFO (`concurrency.ts`) pour la création des worktrees et les fusions; avant de fusionner, la branche intègre `developpement` (tests relancés si celui-ci a avancé), un conflit est détecté sans toucher à `developpement` (`conflict: true`); `TODO.md merge=union` dans `.gitattributes`. Tests : `git.parallel.test.ts` (vrai dépôt).

## Agents en parallèle

`BOUCLE_PARALLEL` (défaut 3, 1 = un seul agent pour tout le lot comme avant, plafond 8). `parallel.ts` `runBatch` : le lot de la tournée est séparé par `independent.ts` (`splitParallel`) : les cartes dont les chemins annoncés (fichiers ou dossiers cités dans le titre, la source, le résumé) ne se recoupent pas partent ensemble, un agent et un worktree par carte (`runPool`, au plus N simultanés); les cartes liées et celles qui ont déjà fait un conflit sont traitées ensuite par un seul agent, en série.

- **Fusion** (`git.ts`) : un verrou FIFO protège la création des worktrees, le checkout, la fusion et le push. Avant de fusionner, la branche intègre `developpement` (qui a avancé avec les autres cartes), tests et `tsc` relancés si besoin. `TODO.md` est fusionné en union (`.gitattributes`).
- **Conflit** : détecté sans toucher à `developpement` (`conflict: true`), la carte est relancée seule après les autres sur un worktree neuf et mémorisée (`avoid`) : plus jamais en parallèle pendant ce run.
- **Budget** : la part du secteur est divisée entre les agents simultanés (`slots`), la réserve reste synchrone (jamais de dépassement).
- **État** : les événements d'un agent portent `agent` (la carte); le panneau liste « N agents en parallèle » sous Implémentation, la phase reste en cours tant qu'un agent travaille; les rapports sont lus dans le worktree de chaque agent (`activeDirs`); la machine à états des cartes est inchangée (`reconcile.ts`).
- Tests : `concurrency`, `independent`, `parallel`, `pipeline.parallel` (faux agents : concurrence 3, worktrees distincts, fusions une à une, conflit, budget, gain de temps), `git.parallel` (vrai dépôt), `panel.agents`. Captures : `docs/screenshots/boucle-parallele/`.
- Limite : l'indépendance est prévue par les chemins annoncés; un recoupement non annoncé est rattrapé par le conflit à la fusion (relance en série), au prix d'un agent refait.

## Recherche rapide et économe

Run réel avant : 4 axes sonnet, 15 tours, 2 passes complètes, ~0,45 € et ~70 s par axe, ~3,7 € au total. Maintenant (`research.ts`, `researchSector.ts`, `researchMerge.ts`, `researchGate.ts`) :

- **Haiku d'abord** (table de routage `research`: haiku → sonnet → opus), 8 tours, 4 recherches web au plus (consigne), 0,30 $ par requête au plus.
- **Une passe** si chaque axe a au moins 3 idées; sinon seuls les axes pauvres sont relancés, avec le modèle suivant.
- **Doublons** entre axes et idées déjà connues retirés par le code (`dedupe`, nom en gras normalisé); la synthèse précédente est conservée et complétée (`mergeDoc`, jamais réécrite de zéro), ses titres sont cités dans la consigne (cache des idées trouvées).
- **Saut de la recherche** (`researchGate`) quand le moodboard a déjà `BOUCLE_RESEARCH_MIN` cartes non terminées (défaut 12) : aucun appel modèle.
- Mesure sur faux agents (`research.measure.test.ts`) : 8 requêtes sonnet de 15 tours (coût relatif 24) → 4 requêtes haiku de 8 tours (coût relatif 4), plafond 5,40 $ → 0,30 $ par requête. Le coût en euros réel est à confirmer sur un run.

## Optimisation de la boucle (retry, preuves, vérification, qualification)

Valeurs de référence, lues par `docs.consistency.test.ts` et comparées à `limits.ts` (une seule source) :

<!-- boucle-constantes
BATCH=6
PATIENCE=3
MAX_ROUNDS=40
MAX_TRIES=3
PARALLEL_DEFAULT=3
-->

- **Retry informé** (`retry.ts`, `failureContext.ts`, `tries.ts`) : une carte refusée garde sa branche et son worktree; l'essai suivant les rouvre,
  reçoit la raison structurée (tsc, tests rouges, fichiers modifiés; 6000 caractères au plus) et reprend la session du SDK (`resume`, repli sur une session neuve).
  Au bout de `MAX_TRIES` essais la carte est bloquée avec sa raison (`bloque`), aucun agent n'est relancé. Un worktree jamais fusionné est archivé en commit WIP avant retrait.
- **Preuves et TODO.md écrits par le code** (`proveReport.ts`, `proveCards.ts`, `gitProofs.ts`) : l'agent ne fournit que `Fait`, `Non fait`, `Décisions`, `Visible`/captures;
  après une fusion verte, le code écrit `## Preuves`, `Statut` et coche `TODO.md` dans un commit `[boucle-proof]` (jamais reverifié, jamais une carte, visible dans `git log` et le journal).
- **Vérification rapide** (`testPlan.ts`, `gitChecks.ts`) : par carte, `tsc` + `vitest related` sur les fichiers modifiés (tests modifiés inclus); documentation seule : rien; doute : suite complète.
  `npm ci` seulement pour les secteurs qui exécutent du code. Pas de partage de `node_modules` (jonction fragile sous Windows, mesurer `npm ci` dans le journal des verrous).
- **Une suite complète par lot** (`gitBatch.ts`, `finishLot.ts`) : sur le worktree de référence, puis push seulement si elle est verte et si `developpement` n'a pas bougé pendant la vérification.
  Un run interrompu avec des fusions non poussées relance cette suite au démarrage suivant (`recoverUnpushed`) avant tout push.
- **Qualification** (`dedupe.ts`, `qualify.ts`, `qualifyStep.ts`, `selectBatch.ts`, `split.ts`) : doublons trouvés par le code (titres, `TODO.md`, `termines.jsonl`), puis UN appel
  modèle par lot (taille S/M/L, fichiers, critères, dépendances; JSON validé à la main, repli `implement`/M, cache `.boucle/qualif.json`). Le code décide : doublon, dépendance non terminée
  ou carte L écartés (L : sous-cartes ajoutées à `fonctionnalites.md`, commit `[boucle-docs]`). Les fichiers déclarés remplacent les chemins devinés pour l'indépendance des agents parallèles.
- **Contexte** : `CLAUDE.md` est chargé par le SDK (`settingSources`), les consignes ne le relisent plus; `TODO.md` n'est plus édité par les agents; le lot vient de la boucle, jamais d'un choix de l'agent.
  Le journal `modele/resultat` porte `ctxChars` et les tokens (`usage`, cache lu/créé) pour mesurer.
- **État** (`runState.ts`, `resume.ts`, `orphans.ts`) : `.boucle/state.json` (écriture atomique, version, validation; fichier corrompu copié en `.corrupt-<ts>` et ignoré), reprise après crash, worktrees orphelins archivés.
