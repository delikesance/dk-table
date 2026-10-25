# Rapport : Vue Formulaire (saisie de lignes)
Statut : termine
Visible : oui

## Fait

- Logique pure `src/engine/form.ts` : un champ par colonne (type déduit: nombre, date, texte), ligne suivante, contrôle de saisie.
- Boîte `src/ui/dialogs/form.ts` (palette « Saisie par formulaire… »): champs, case « Obligatoire », erreurs sous chaque champ, écriture de la ligne en un pas d'annulation (`app.editMany`), réinitialisation après envoi, Entrée envoie.
- Tests écrits avant le code: `src/engine/form.test.ts` (9), `src/ui/dialogs/form.test.ts` (5), e2e `e2e/feat-formulaire.spec.ts` (3).
- Doc: `docs/formulaire.md`.

## Non fait

## Captures

- docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-initial-clair.png
- docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-initial-sombre.png
- docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-obligatoire-clair.png
- docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-obligatoire-sombre.png
- docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-resultat-clair.png
- docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-resultat-sombre.png

## Decisions

- Le design `docs/design/2026-10-25-220125.html` porte sur Espion, Analyse rapide et Appareil photo, pas sur le formulaire: pas de maquette disponible, la vue suit les critères de la carte.
- Les fichiers indiqués par la carte (`src/views/FormView.tsx`, `src/lib/…`, `src/store/rows.ts`) n'existent pas: le dépôt est en TypeScript/DOM. Implémentation dans `src/engine/form.ts` et `src/ui/dialogs/form.ts`.
- Forme choisie: boîte modale (comme Tableau croisé), pas un onglet. Entrée dans la palette seulement, pas de menu.
- « Obligatoire » se choisit dans la boîte et n'est pas enregistré dans le classeur (pas de changement de format).
- La ligne ajoutée est la première ligne après la dernière ligne utilisée (dk-table n'a pas de tableaux structurés).
- Limite visuelle: le libellé « Obligatoire » touche le bord de la boîte à 1200 px; non corrigé.

## Preuves
- Tests : ok (232 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-initial-clair.png, docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-initial-sombre.png, docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-obligatoire-clair.png, docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-obligatoire-sombre.png, docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-resultat-clair.png, docs/screenshots/vue-formulaire-saisie-de-lignes/formulaire-resultat-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"count":232,"scope":"related"},"tsc":{"ok":true}} -->
