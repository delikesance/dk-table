# Rapport : UI du plan repliable (gouttière, boutons de niveaux)
Statut : en-cours
Visible : oui

## Fait
- +/- dans la marge de l'en-tête de ligne, sur chaque ligne qui a du détail au-dessus ; clic = replier / déplier, numéros de ligne conservés.
- Boutons de niveaux 1 à 3 dans le coin ; cachés sans niveau > 0.
- Masque commun avec les filtres (`gridFilter.ts`) ; curseur déplacé hors d'une ligne masquée.
- Clavier : boutons focalisables, Entrée/Espace les activent, sans sélection de ligne ni édition.
- Tests d'abord : `src/ui/grid/gridOutline.test.ts` (rouge avant code). Vert avec les tests grille existants.
- Documentation : `docs/plan-outline.md` (section Interface).

## Non fait
- Commandes de groupement / dégroupement et sous-totaux automatiques : cartes « Plan et regroupement » et « Moteur de sous-totaux ». Sans elles, le plan ne se crée que par `window.__dkOutline` (dev).
- Persistance de l'état replié dans le `.dktable` (vue seule pour l'instant).
- Pas de raccourci clavier dédié au plan ; pas d'état « pressé » sur les boutons de niveaux.

## Captures
- Clair : `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/plan-initial-clair.png` (+/- sur lignes 4 et 7)
- Clair : `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/groupe-replie-clair.png` (groupe fruits replié, numéros 4 et 7 conservés)
- Clair : `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/niveau-1-clair.png` (bouton 1 : seul le niveau 0 visible)
- Sombre : `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/plan-initial-sombre.png`
- Sombre : `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/groupe-replie-sombre.png`
- Sombre : `docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux/niveau-1-sombre.png`

## Decisions
- Les fichiers du brief (`.tsx`) n'existent pas : le projet est en TypeScript pur. Fichiers : `ui/grid/outlineView.ts` (DOM des boutons, pur), `ui/grid/gridOutline.ts` (contrôleur), `grid.ts` / `gridFilter.ts` / `types.ts` / `grid.css`, `appGrid.ts` / `appApi.ts` / `appTypes.ts` / `main.ts` (hook dev).
- Pas de colonne de gouttière dédiée : le +/- est posé dans la marge de l'en-tête de ligne, sans toucher au modèle de colonnes (gel, redimensionnement).
- Niveaux : bouton k (1 à 3) = `showLevel(o, k-1)`, comme Excel (bouton 1 = seul le niveau 0 reste visible).
- Le masquage passe par le masque de lignes des filtres : les numéros de ligne restent ceux de la feuille.
- État dans `GridView.outline` (vue par feuille, non persistée).
- `grid.ts` était à 200 lignes : compactage de trois blocs existants (apply de remplissage, `bindClipboard`, relist) pour rester sous la limite.
- Hook de développement `window.__dkOutline(niveaux)` (et `App.setOutlineLevels`) : sert aux captures et aux tests e2e, car rien ne crée encore de niveaux.

## Preuves
- Tests : ok (331 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"count":331,"scope":"related"},"tsc":{"ok":true}} -->
