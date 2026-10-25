# Rapport : Dialogue d'outils d'analyse et sortie en feuille
Statut : termine
Visible : oui

## Fait
- `src/engine/analysis.ts` : statistiques descriptives, corrélation, régression linéaire ; plage d'entrée ; sortie en tableau avec en-têtes (`outputSheet`).
- `src/ui/dialogs/analysis.ts` : dialogue (outil, plage, en-têtes, X/Y pour la régression, nom de feuille). Erreurs de plage ou de calcul affichées sans écriture ; Créer ajoute la feuille ; Fermer ne modifie rien.
- Palette « Outils d'analyse… » (`src/ui/commands.ts`).
- Tests : `src/engine/analysis.test.ts`, `src/ui/dialogs/analysis.test.ts` (TDD, écrits avant le code), e2e `e2e/feat-outils-analyse.spec.ts`.
- Doc : `docs/outils-d-analyse.md`.

## Non fait

## Captures
- docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/erreur-plage-clair.png
- docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/erreur-plage-sombre.png
- docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/resultat-correlation-clair.png
- docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/resultat-correlation-sombre.png

## Decisions
- Design `docs/design/2026-10-25-220125.html` : il décrit Espion, Analyse rapide et Appareil photo, pas ce dialogue. Non utilisé ; le dialogue suit le modèle de `ui/dialogs/pivot.ts`.
- Outils : statistiques descriptives, corrélation, régression linéaire (moteurs `engine/stats/` existants, désormais câblés).
- Valeurs lues dans les cellules brutes (`activeDoc().cells`) : nombres saisis = valeurs ; formules et texte ignorés pour le calcul.
- Résultats figés (pas de lien avec la source), arrondis à 6 décimales.
- Hors carte : entrée de menu « Données » non ajoutée (palette seule) ; pas d'option de sortie vers une plage existante (nouvelle feuille seulement) ; pas de moyenne mobile ni de tests t/F/χ² dans ce dialogue.

## Preuves
- Tests : ok (233 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/erreur-plage-clair.png, docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/erreur-plage-sombre.png, docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/resultat-correlation-clair.png, docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille/resultat-correlation-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"count":233,"scope":"related"},"tsc":{"ok":true}} -->
