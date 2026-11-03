# Stratégie de branches et CI/CD

- `développement` : branche d'intégration, seule cible des PR. `ci.yml` s'exécute sur ces PR.
- `main` : branche de publication. Un merge (ex. `développement` -> `main`) déclenche `ci.yml` (push) et `release.yml`.
- `release.yml` : `build-linux` (deb + AppImage), `build-windows` (msi + nsis), puis `publish` crée la release GitHub `v<version>` (version de `src-tauri/tauri.conf.json`). Le tag existant fait échouer `publish` : incrémenter la version avant de fusionner dans `main`.

## Réglages GitHub à faire (le workflow seul n'interdit rien)

1. Créer `développement` et `main` (la branche par défaut actuelle est `master`; renommer `master` en `main` dans Settings > General > Default branch, ou adapter les noms dans les workflows).
2. Settings > Branches > Rulesets : sur `main`, exiger une PR, restreindre la source (merge depuis `développement` uniquement, via approbation ou bypass limité) et exiger les checks `test` et `e2e`.
3. Sur `développement` : exiger une PR et les checks `test` et `e2e`.
4. Pour que les contributeurs ouvrent leurs PR vers `développement`, la définir comme branche par défaut après la première release (ou la garder sur `main` et le rappeler dans le modèle de PR).
