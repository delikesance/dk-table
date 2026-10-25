# Boucle : moodboard en temps réel, garde de fusion, journal technique

## Moodboard en temps réel
- Le serveur numérote chaque événement SSE (`id: <run>-<rang>`, `ts` posé à l'émission). À la reconnexion le navigateur envoie `Last-Event-ID`: seuls les événements manqués sont rejoués, dans l'ordre. Un id d'un autre run rejoue tout.
- Chaque événement invalide le cache de `/moodboard` (`memoBy`, compteur d'événements) au lieu d'attendre 2 s.
- Le client (`moodboard-view.js`) applique l'événement tout de suite (carte vue par un agent = « en cours », pastille « ● agent » issue des événements `start/end` portant `agent`), puis relit l'état réel (un seul GET en vol, un dernier relancé si des événements sont arrivés entre-temps). La réponse du serveur fait foi. Filet : relecture toutes les 15 s et à chaque reconnexion.
- En-tête : « ● en direct / ○ reconnexion… » et « mis à jour il y a Xs ».
- Chaque carte est dans exactement une colonne (test sur 60 cartes).
- Doublons : `mergeDuplicates` (même id ou mêmes mots significatifs), le statut le plus avancé gagne.

## Garde de fusion (`git.ts`, `mergeGuard.ts`)
- Un test déjà rouge sur la base n'est toléré que si la base a été vérifiée dans son worktree isolé ET qu'il n'est lié à aucun fichier modifié (même nom, préfixe de nom, test modifié). Sinon refus.
- Suite non verte tolérée = fusion locale seulement, jamais de push.
- Après `merge --no-ff`, l'arbre fusionné doit être celui testé dans le worktree; sinon `reset --keep` et refus.
- Une seule suite (tests + tsc) à la fois sur la machine (verrou).
- Tests de chronométrage remplacés par des compteurs de concurrence (aucun seuil en ms dans la suite).

## Preuves et rapports périmés
- `proofs.ts`: ligne « Captures » = liste de chemins, accolades développées, notes `(...)` ignorées, « sans objet » = exemption; existence vérifiée par le code.
- `stale.ts`: un rapport « en cours » sans agent actif est archivé (`.boucle/archives/`), son empreinte mémorisée (`.boucle/perimes.jsonl`); la carte repart propre en idée. Réparation au démarrage de chaque run, sans commit.

## Journal technique (`.boucle/logs/<run>.jsonl`)
- JSON Lines, un fichier par run: `ts` ISO, `ms` depuis le début, `level`, `comp`, `run`, `agent`, `card`, `msg` + champs (`cmd`, `cwd`, `code`, `durMs`, `out`, `model`, `costUsd`, `turns`, `maxBudgetUsd`, `from`/`to`/`cause`, `err{message,stack}`).
- Sources: toutes les commandes (`wrapRun`), tous les appels modèle (`wrapQuery`, jamais `options.env`), tous les événements du pipeline (`logEvent`), chaque transition d'état de carte avec cause (`trackBoard`), tournées.
- Secrets: `logRedact.ts` masque `sk-ant-…`, `sk-…`, `ghp_`, `github_pat_`, `Bearer`, JWT, `NOM_SENSIBLE=valeur` et les valeurs des variables d'environnement `*TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|OAUTH*`; ANSI retirés; sorties tronquées (2000 car.).
- Réglages: `BOUCLE_LOG=debug|info|warn|error` (défaut info); 5 Mo par run (au-delà: ligne « journal tronqué », erreurs encore admises jusqu'à 10 Mo); 30 fichiers gardés.
- Lecture: `GET /logs?run=&card=&agent=&level=&comp=&q=&limit=` (JSON) et `GET /diagnostic?run=` (texte à coller dans le chat). Le diagnostic de fin de run est aussi écrit dans `<run>.diagnostic.md` et annoncé dans le journal du panneau.
- Le journal lisible du panneau reste séparé; ses lignes `card` répétées sont regroupées (« rapport x mis à jour ×N »).
