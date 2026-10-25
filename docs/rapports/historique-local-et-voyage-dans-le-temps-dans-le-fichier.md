# Rapport : Historique local et voyage dans le temps dans le fichier
Statut : termine
Visible : oui

## Fait
- Journal par cellule, curseur temporel, instantanés nommés, comparaison : `src/io/history.ts`, `src/ui/history/store.ts`, `src/ui/dialogs/history.ts` (base déjà présente, reprise).
- Commande palette « Historique et versions… » : `src/ui/commands.ts`.
- `journalNow` : journalise les modifications non enregistrées (ouverture du dialogue), utilisable sans fichier chargé : `src/ui/history/store.ts`.
- e2e + captures : `e2e/feat-historique.spec.ts`. Doc : `docs/historique-local.md`. TODO.md coché.

## Non fait
- Pas d'entrée de menu (palette seule); pas d'historique par édition (granularité = sauvegarde/dialogue/instantané).
- Tests instables hors carte (non liés à l'historique) : `src/ui/appDocs.test.ts` (« revient à la grille… », vert 3/3 sur 3 `npm test`) et `prototypes/oauth-sdk/parallel.test.ts` (test de durée 30 ms, échoue 2/3 selon la charge).

## Preuves
- Tests : ok (2125 tests, tsc ok, e2e feat-historique 2/2)
- Captures : docs/screenshots/historique-local-et-voyage-dans-le-temps-dans-le-fichier/instantane-clair.png, docs/screenshots/historique-local-et-voyage-dans-le-temps-dans-le-fichier/instantane-sombre.png, docs/screenshots/historique-local-et-voyage-dans-le-temps-dans-le-fichier/voyage-clair.png, docs/screenshots/historique-local-et-voyage-dans-le-temps-dans-le-fichier/voyage-sombre.png

## Decisions
- Persistance : champ `history` du `.dktable` (hors ligne, voyage avec le fichier), pas de localStorage.
- Design de référence (par cellule, 50 versions, Alt+H) non suivi à la lettre : périmètre minimal; journal global plafonné à 5000.
- Journal calculé par différence d'états, pas par frappe.
