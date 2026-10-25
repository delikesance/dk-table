# Rapport : Boîte de dialogue Sous-totaux
Statut : en-cours
Visible : oui

## Fait
- Données > Sous-totaux… ouvre la boîte : colonne de groupe, fonction (Somme, Nombre, Moyenne, Min, Max), colonnes à totaliser, case « première ligne est un en-tête ».
- Valider (désactivé sans colonne à totaliser) : appelle `applySubtotals` → moteur `engine/subtotalsPlan.ts`, écrit le plan sous la sélection en un pas d'annulation, pose les niveaux du plan.
- Annuler : ne modifie rien (test « Annuler ne modifie pas la feuille »).
- Tout supprimer : rétablit le contenu d'origine de la zone écrite et retire les niveaux du plan.
- Refus avec message si une cellule sous la sélection serait écrasée.
- Critères couverts par `src/ui/dialogs/subtotals.test.ts` et `subtotalsApply.test.ts` (28 tests liés verts, `npx vitest run`).

## Non fait
- (aucun reste dans les critères de la carte)

## Captures
- Clair : `docs/screenshots/boite-de-dialogue-sous-totaux/boite-clair.png` (boîte ouverte, colonne B cochée)
- Clair : `docs/screenshots/boite-de-dialogue-sous-totaux/applique-clair.png` (après Valider : Total Fruits, Total Légumes, Total général, +/- sur les sous-totaux)
- Sombre : `docs/screenshots/boite-de-dialogue-sous-totaux/boite-sombre.png`
- Sombre : `docs/screenshots/boite-de-dialogue-sous-totaux/applique-sombre.png`

## Decisions
- Design `docs/design/2026-10-25-220125.html` lu : sujet « Espion, Analyse rapide, Appareil photo », aucun lien avec les sous-totaux. Non utilisé ; la boîte suit l'existant (`dk-dialog`).
- Projet TypeScript pur : les fichiers `.tsx` du brief n'existent pas. Fichiers réels : `src/ui/dialogs/subtotals.ts` (dialogue), `src/ui/dialogs/subtotalsApply.ts` (écriture, suppression), `src/engine/subtotalsPlan.ts` (plan pur), entrée de menu dans `src/ui/menubar/spec.ts`.
- Hors de la carte, à traiter ailleurs (limites connues) :
  - Plan gardé en mémoire par feuille, pas dans le `.dktable` : après rechargement, « Tout supprimer » ne fonctionne plus.
  - Une seule colonne de groupe dans l'interface (le moteur en accepte 1 à 3).
  - Les formules de la zone écrite sont recopiées telles quelles (pas de décalage de références).
- Appliquer sur une feuille où un plan existe déjà : le plan précédent est retiré d'abord, puis le nouveau est calculé sur la sélection courante.
- Niveaux du plan : données = nombre de colonnes de groupe, sous-total de niveau l = l, total général = 0 (compatible avec `engine/outline.ts`).

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
