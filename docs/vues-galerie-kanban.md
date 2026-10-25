# Vues Galerie et Kanban

Palette Ctrl+K : « Vue Galerie… », « Vue Kanban… ». Boîtes modales sur la feuille active (ligne 1 = en-têtes, 1re colonne = titre).

- Galerie : `src/engine/gallery.ts` (`galleryCards`), `src/ui/dialogs/gallery.ts`. Champs cochables; clic ou Entrée sur une carte = sélectionne la ligne (`A<n>`); grille CSS `auto-fill` (s'adapte à la largeur).
- Kanban : `src/engine/kanban.ts` (`groupByStatus`, `moveCard`, `NO_STATUS`), `src/ui/dialogs/kanban.ts`. Colonne de statut choisie (défaut : en-tête « Statut/État/Étape… », sinon dernière colonne). Déplacer = glisser une carte ou liste de la carte : écrit le statut dans la cellule (`app.edit`, annulable). « Sans statut » = cellule vide.
- Filtres : `App.rowHidden(row)` (filtre de colonne ou plan replié) écarte les lignes masquées des deux vues.
- Styles : `src/ui/dialogs/views.css`. Tests : `gallery.test.ts`, `kanban.test.ts` (engine + dialogs), e2e `e2e/feat-vues.spec.ts`.
- Limites : vues non persistées dans le classeur; la boîte ne se met pas à jour si la grille change pendant qu'elle est ouverte.
