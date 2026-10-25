# Rapport : Listes personnalisées de tri et de recopie
Statut : en-cours
Visible : oui

## Fait
- Tri: `ui/sort.ts` `sortColumn(..., { lists })` applique la liste utilisateur la plus pertinente (celle qui contient le plus de valeurs de la colonne); `ui/appApi.ts` passe `customLists.lists()`.
- Dialogue `ui/dialogs/customLists.ts` (Paramètres > « Listes personnalisées… »): liste affichée, saisie, refus affiché (texte, pas de HTML).
- `io/customLists.ts`: type `CustomLists` exporté.
- e2e `e2e/feat-listes-personnalisees.spec.ts` (clair + sombre, captures).
- Tests: `src/ui/sortList.test.ts`, `src/ui/dialogs/customLists.test.ts`.
- `src/engine/custom-lists.ts`: `validateList` (refuse vide, moins de 2 éléments, doublon à casse près, liste identique à une existante), `parseListText` (saisie par ligne, virgule ou point-virgule).
- `src/io/customLists.ts`: `createCustomLists(store)` persiste dans localStorage (`dk-table.customLists`), store injectable comme `io/recents.ts`; instance `customLists` pour l'app. Données corrompues = liste vide.
- `src/engine/series-names.ts`: `nameSeries(src, dir, extra)` teste les listes utilisateur avant les intégrées; recopie cyclique; insensible à la casse; casse de la source appliquée.
- `src/engine/series.ts`: `extendSeries(..., lists)`; `src/ui/grid/seriesFill.ts` passe `customLists.lists()` (poignée de recopie).
- `src/engine/sort.ts`: option `list` (les valeurs de la liste passent avant les autres, dans l'ordre de la liste; vides en bas; `desc` inverse dans la liste).
- Tests: `src/engine/custom-lists.test.ts`, `src/engine/series-custom.test.ts`, `src/engine/sort-custom.test.ts`, `src/io/customLists.test.ts`. Tests liés (series, sort, ui/grid): 35 fichiers, 289 tests verts; `tsc --noEmit` sans erreur.
- Suppression: `io/customLists.ts` `remove(i)` (persistée), bouton « Supprimer » par liste dans `ui/dialogs/customLists.ts`; tests `src/io/customLists.test.ts`, `src/ui/dialogs/customLists.test.ts`; e2e étendu (suppression).

- Modification d'une liste: `io/customLists.ts` `replace(i, raw)` (même validation; la liste elle-même n'est pas comparée à son ancienne valeur); dialogue: bouton « Modifier » par liste recharge la saisie, le bouton devient « Enregistrer la modification ». Tests: `src/io/customLists.test.ts`, `src/ui/dialogs/customLists.test.ts`; e2e « modifie une liste existante ».

## Non fait
- Tri: choix de la liste par l'utilisateur (la liste est détectée automatiquement); pas de tri par liste dans l'e2e (couvert par les tests unitaires).

## Captures
- `docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/liste-ajoutee-clair.png`, `liste-ajoutee-sombre.png` (liste enregistrée)
- `docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/refus-doublon-clair.png`, `refus-doublon-sombre.png` (doublon refusé, raison affichée)
- `docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/liste-supprimee-clair.png`, `liste-supprimee-sombre.png` (liste supprimée)
- `docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/liste-modifiee-clair.png`, `liste-modifiee-sombre.png` (liste modifiée)

## Decisions
- Dialogue `ui/dialogs/customLists.ts` ouvert depuis Paramètres (bouton « Listes personnalisées… »): saisie par ligne/virgule, erreur affichée si refus.
- Tri (`ui/sort.ts`): la liste utilisée est celle qui contient le plus de valeurs de la colonne (au moins une); les autres valeurs passent après, triées normalement.
- Design `docs/design/2026-10-25-200330.html` ignoré: il traite de l'analyse what-if, pas des listes (avis du sous-agent `trancheur`, confirmé).
- Modules purs `engine/custom-lists.ts` + persistance `io/customLists.ts`, calqués sur `io/recents.ts`.
- Recopie: les listes utilisateur sont testées avant les listes intégrées (mois/jours); cohérent avec la priorité déjà donnée aux jours pour « mar ».
- Tri: éléments de la liste d'abord (ordre de la liste), les autres ensuite triés normalement; en `desc`, l'ordre de la liste est inversé, les autres restent après.
- Saisie: séparateurs retour à la ligne, virgule, point-virgule.
- Doublon refusé à casse près et au niveau de la séquence (même liste dans un autre ordre = liste différente, acceptée).
- Design `docs/design/2026-10-25-204816.html` non suivi: il porte sur « Valeur cible et évaluation pas à pas » (Données > Valeur cible), sans rapport avec les listes. Décision prise sans sous-agent (sujet évident).
- Chemins de la carte (`src/data/custom-lists.ts`, `src/ui/OptionsDialog.tsx`, `src/engine/autofill.ts`) n'existent pas: l'implémentation réelle est `engine/custom-lists.ts`, `io/customLists.ts`, `ui/dialogs/customLists.ts`, `engine/series-names.ts`.
- Suppression par position (bouton par liste), sans confirmation: la liste se ressaisit en quelques secondes.
- Design `docs/design/2026-10-25-212335.html` non suivi: il porte sur Valeur cible, fenêtre Espion et Remplissage instantané, sans lien avec les listes.
- Modification: même dialogue (pas de nouvelle fenêtre); « Enregistrer la modification » remplace la liste à sa position, un refus garde le mode modification.

## Preuves
- Tests : ok (358 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/liste-ajoutee-clair.png, liste-ajoutee-sombre.png (absente), docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/refus-doublon-clair.png, refus-doublon-sombre.png (absente), docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/liste-supprimee-clair.png, liste-supprimee-sombre.png (absente), docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/liste-modifiee-clair.png, liste-modifiee-sombre.png (absente)
<!-- boucle-proof {"tests":{"ok":true,"count":358,"scope":"related"},"tsc":{"ok":true}} -->
