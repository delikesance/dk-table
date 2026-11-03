# Mise à jour automatique

dk-table se met à jour depuis ses releases GitHub (plugin Tauri `updater`, signatures minisign).

## Fonctionnement
- Au démarrage (après ~5 s) puis à la demande (menu Fichier ou palette « Rechercher des mises à jour… »), l'app lit `https://github.com/delikesance/dk-table/releases/latest/download/latest.json`.
- Si la version est plus récente, un toast propose **Installer** : téléchargement avec progression, vérification de la signature avec la clé publique de `tauri.conf.json`, installation, puis **Redémarrer** (jamais automatique : le document peut contenir des modifications non enregistrées, le message le rappelle).
- Sans effet dans le navigateur, en dev et dans les tests e2e (détection de `__TAURI_INTERNALS__`). Code : `src/ui/updater.ts`.

## Clés et secrets
- Clé privée : `~/.tauri/dk-table.key` (hors dépôt, sans mot de passe). **La perdre, ou en changer, empêche toute mise à jour des versions déjà installées.**
- Clé publique : `plugins.updater.pubkey` dans `src-tauri/tauri.conf.json`.
- Secrets GitHub (Settings > Secrets and variables > Actions) : `TAURI_SIGNING_PRIVATE_KEY` (contenu du fichier `.key`) et `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (vide).
- Settings > Actions > General > Workflow permissions : « Read and write », sinon l'étape `publish` échoue en 403.

## Publier une version
1. Incrémenter la version dans `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock`.
2. Fusionner `developpement` dans `master` : `release.yml` construit, signe (`.sig`), génère `latest.json` (Linux AppImage, Windows nsis) et crée la release `v<version>`.

## Limites
- Linux : seule l'AppImage se met à jour (pas le `.deb`). Windows : `.exe` (nsis) ; le `.msi` est publié mais `latest.json` pointe sur le `.exe`.
- La première version avec l'updater (0.4.0) s'installe à la main ; les versions précédentes (≤ 0.3.0) n'ont pas d'updater.
- Non testé de bout en bout avant deux releases signées successives.
