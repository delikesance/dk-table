# CI/CD : rapide sur développement, complète sur main

| Événement | Workflow | Contenu | Durée visée |
|---|---|---|---|
| push sur toute branche sauf `main` (dont `developpement`) | `ci.yml` | `npm ci` (cache npm), `tsc --noEmit`, `vitest run --changed HEAD~1` | 1 à 2 min |
| PR vers `main`, push sur `main` | `ci-full.yml` | `test` (tsc + vitest complet), `cargo` (Rust, paquets apt en cache), `e2e` (Playwright, 3 shards, Chrome du runner) | 5 à 8 min |
| push sur `main` | `release.yml` | builds Linux + Windows, release `v<version>` | inchangé |

Règles :

- Sur `developpement` on pousse sans attendre : la CI rapide ne bloque rien (aucun check requis, pas de PR obligatoire pour la Boucle).
- Les gros tests ne tournent qu'au passage `developpement` -> `main`. Checks à exiger sur `main` : `test`, `cargo`, `e2e` (3 shards).
- `concurrency` annule le run précédent de la même ref (sauf `release.yml`, qui ne s'interrompt pas).
- e2e : `E2E_CHANNEL=chrome` utilise le Chrome déjà installé sur le runner, donc aucun téléchargement de navigateur ni `--with-deps`.
- Pas de paquets système Tauri sur la CI rapide (c'était l'étape de plus de 10 min).
- Test de la configuration : `src/config/ci.test.ts`.
