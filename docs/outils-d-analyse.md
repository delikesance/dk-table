# Outils d'analyse

Palette « Outils d'analyse… » (catégorie Données). Crée une feuille « Analyse » avec les résultats.

## Usage
1. Choisir l'outil : statistiques descriptives, corrélation, régression linéaire.
2. Saisir la plage d'entrée (ex. `A1:C10`). Par défaut : zone utilisée de la feuille active.
3. Cocher « La première ligne contient les en-têtes » si besoin.
4. Régression : indiquer les numéros de colonne X et Y dans la plage.
5. « Créer » écrit la feuille ; « Fermer » n'écrit rien.

Plage vide, invalide ou résultat impossible (pas de colonne numérique, une seule colonne pour la corrélation) : message dans le dialogue, rien n'est écrit.

## Limites
- Lit les valeurs saisies (cellules brutes) : les formules et le texte sont ignorés pour le calcul.
- Les résultats sont des valeurs figées (pas de lien avec la source), arrondies à 6 décimales.

## Code
- `src/engine/analysis.ts` : logique pure (`analysisInput`, `runAnalysis`, `outputSheet`).
- `src/ui/dialogs/analysis.ts` : dialogue (`openAnalysis`), branché dans `src/ui/commands.ts`.
- Calculs : `src/engine/stats/` (descriptive, correlation, regression).
- Tests : `src/engine/analysis.test.ts`, `src/ui/dialogs/analysis.test.ts`, `e2e/feat-outils-analyse.spec.ts`.
