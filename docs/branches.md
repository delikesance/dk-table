# Stratégie de branches et CI/CD

- `développement` : branche d'intégration, seule cible des PR. `ci.yml` s'exécute sur ces PR.
- `master` : branche de publication. Un merge (ex. `développement` -> `master`) déclenche `ci.yml` (push) et `release.yml`.
- `release.yml` : `build-linux` (deb + AppImage), `build-windows` (msi + nsis), puis `publish` crée la release GitHub `v<version>` (version de `src-tauri/tauri.conf.json`). Le tag existant fait échouer `publish` : incrémenter la version avant de fusionner dans `master`.

## Réglages GitHub à faire (le workflow seul n'interdit rien)

1. Créer `développement` ; `master` est la branche par défaut et la branche de publication.
2. Settings > Branches > Rulesets : sur `master`, exiger une PR, restreindre la source (merge depuis `développement` uniquement, via approbation ou bypass limité) et exiger les checks `test` et `e2e`.
3. Sur `développement` : exiger une PR et les checks `test` et `e2e`.
4. Pour que les contributeurs ouvrent leurs PR vers `développement`, la définir comme branche par défaut après la première release (ou la garder sur `master` et le rappeler dans le modèle de PR).
