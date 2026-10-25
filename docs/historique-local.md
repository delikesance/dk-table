# Historique local et voyage dans le temps

- **Quoi** : journal par cellule (ancienne/nouvelle valeur, horodatage), curseur temporel, instantanés nommés, comparaison avec l'état actuel. Hors ligne : tout vit dans le `.dktable` (champ `history`), aucun serveur.
- **Code** : `io/history.ts` (pur : `recordChanges`, `cellHistory`, `timeline`, `rewind`, `addSnapshot`, `snapshotDoc`; journal plafonné à 5000 entrées), `io/historyFormat.ts` (validation), `ui/history/store.ts` (état du classeur ouvert, `journalNow`), `ui/dialogs/history.ts` (dialogue), diff rendu par `renderDiff` (`io/diff.ts`).
- **Usage** : palette Ctrl+K « Historique et versions… ». Le dialogue liste le journal de la cellule active, le curseur compare un état passé à l'actuel (« Restaurer cet état »), les instantanés se créent par nom et se comparent.
- **Pourquoi** : le journal est calculé par différence entre deux états (à l'enregistrement, à l'ouverture du dialogue et à la création d'un instantané), sans surcoût à chaque frappe. Granularité = ces points, pas chaque édition.
- **Restauration** : recharge le classeur en gardant l'historique; le retour en arrière est journalisé à la sauvegarde suivante.
- **Tests** : `io/history.test.ts`, `ui/history/store.test.ts`, `ui/dialogs/history.test.ts`, e2e `e2e/feat-historique.spec.ts`.
