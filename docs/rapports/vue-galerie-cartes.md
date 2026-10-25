# Rapport : Vue Galerie (cartes)
Statut : termine
Visible : oui

## Fait
- `src/engine/gallery.ts` (`galleryCards`) et boîte `src/ui/dialogs/gallery.ts` : une carte par ligne, champs cochables, clic/Entrée = sélection de la ligne, grille CSS auto-fill (largeur adaptative), lignes masquées par le filtre ignorées.
- Palette « Vue Galerie… ». `App.rowHidden`. Styles `views.css`.
- Tests écrits d'abord : `src/engine/gallery.test.ts` (3), `src/ui/dialogs/gallery.test.ts` (2), e2e `e2e/feat-vues.spec.ts`. Doc : `docs/vues-galerie-kanban.md`.

## Non fait

## Captures
- docs/screenshots/vue-galerie-cartes/galerie-clair.png
- docs/screenshots/vue-galerie-cartes/galerie-sombre.png

## Decisions
- Fichiers `.tsx` de la carte inexistants : implémentation TS/DOM en boîte modale (comme Formulaire), pas d'onglet ni de ViewSwitcher.
- Vue non persistée dans le classeur.

## Preuves
- Tests : ok (369 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/vue-galerie-cartes/galerie-clair.png, docs/screenshots/vue-galerie-cartes/galerie-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"count":369,"scope":"related"},"tsc":{"ok":true}} -->
