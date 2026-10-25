# Rapport : Boîte de dialogue Sous-totaux
Statut : en-cours
Visible : oui

## Fait
- Données > Sous-totaux… ouvre la boîte : colonne de groupe, fonction (Somme, Nombre, Moyenne, Min, Max), colonnes à totaliser (Valider désactivé tant qu'aucune), case « première ligne est un en-tête ».
- Valider : écrit le plan (moteur `engine/subtotals.ts`) sous la sélection en un pas d'annulation, pose les niveaux du plan (replier un sous-total masque ses données).
- Annuler : ne modifie rien.
- Tout supprimer : rétablit le contenu d'origine de la zone écrite et retire le plan.
- Refus avec message si une cellule sous la sélection serait écrasée.
- Documentation : `docs/sous-totaux.md` (section Interface).

## Non fait
- Plan gardé en mémoire par feuille, pas dans le `.dktable` : après rechargement, « Tout supprimer » ne fonctionne plus.
- Une seule colonne de groupe dans l'interface (le moteur en accepte 1 à 3).
- Les formules de la zone écrite sont recopiées telles quelles (pas de décalage de références).

## Captures
- Clair : `docs/screenshots/boite-de-dialogue-sous-totaux/boite-clair.png` (boîte ouverte, colonne B cochée)
- Clair : `docs/screenshots/boite-de-dialogue-sous-totaux/applique-clair.png` (après Valider : Total Fruits, Total Légumes, Total général 42, +/- sur les sous-totaux)
- Sombre : `docs/screenshots/boite-de-dialogue-sous-totaux/boite-sombre.png`
- Sombre : `docs/screenshots/boite-de-dialogue-sous-totaux/applique-sombre.png`

## Decisions
- Le design `docs/design/2026-10-25-212335.html` existe mais traite de Valeur cible / Espion / Remplissage instantané : hors sujet, non utilisé.
- Les fichiers du brief (`.tsx`) n'existent pas : projet TypeScript pur. Fichiers : `src/engine/subtotalsPlan.ts` (plan pur), `src/ui/dialogs/subtotalsApply.ts` (écriture, plan en mémoire, suppression), `src/ui/dialogs/subtotals.ts` (dialogue), entrée de menu dans `src/ui/menubar/spec.ts`.
- Niveaux du plan : données = nombre de colonnes de groupe, sous-total de niveau l = l, total général = 0 (compatible avec `engine/outline.ts`).
- Appliquer sur une feuille où un plan existe déjà : le plan précédent est retiré d'abord, puis le nouveau est calculé sur la sélection courante.
- « Tout supprimer » ne marche que sur la feuille où le plan a été appliqué.

## Preuves
- Tests : ok (255 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"count":255,"scope":"related"},"tsc":{"ok":true}} -->
