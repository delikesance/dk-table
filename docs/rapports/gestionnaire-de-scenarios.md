# Rapport : Gestionnaire de scénarios
Statut : termine
Visible : oui

## Fait
- Scénario nommé = valeurs brutes de la sélection (32 cellules max, message explicite au-delà), nom unique.
- Application en un clic : écriture des valeurs puis recalcul, un pas d'annulation par feuille.
- Sauvegarde dans le `.dktable` (champ `scenarios`, validé à l'ouverture).
- Menu Données > « Scénarios… » (boîte : liste, Appliquer, Supprimer, enregistrer la sélection).
- Tests unitaires (engine, store, format, dialogue) et e2e clair/sombre avec captures.
- Doc : `docs/gestionnaire-de-scenarios.md`.

## Non fait

## Captures
- `docs/screenshots/gestionnaire-de-scenarios/enregistrer-clair.png` : boîte avec le scénario « Base » enregistré (clair).
- `docs/screenshots/gestionnaire-de-scenarios/enregistrer-sombre.png` : même état (sombre).
- `docs/screenshots/gestionnaire-de-scenarios/appliquer-clair.png` : après « Appliquer » (A1 revient à 100, B1 = 200) (clair).
- `docs/screenshots/gestionnaire-de-scenarios/appliquer-sombre.png` : même résultat (sombre).

## Decisions
- Design `docs/design/2026-10-25-220125.html` (Espion / Analyse rapide / Appareil photo) hors sujet pour cette carte : non suivi, construit selon les critères de la carte.
- Une cellule variable = toute cellule de la sélection, vides incluses ; la limite de 32 compte la sélection entière.
- Les scénarios sont liés à la feuille où ils ont été enregistrés (identifiant de feuille) ; l'application écrit dans chaque feuille concernée.
- Annulation : un pas par feuille (`batchEdit`), Ctrl+Z ne couvre que la feuille active (limite connue).
- Pas de scénarios Base/Pire/Meilleur préremplis : noms saisis par l'utilisateur.
- `scenarioStore.test.ts` écrit après le store (écart au TDD, comportement vérifié par le test).
- `ui/appApi.ts` était à exactement 200 lignes : câblage des scénarios regroupé dans `ui/appScenarios.ts` (`scenarioApi`, `scenarioField`, `loadScenarios`) et deux entrées d'objet fusionnées sur une ligne.
- CLAUDE.md non modifié (la boucle/orchestrateur gère la doc de structure) ; `docs/gestionnaire-de-scenarios.md` ajouté.

## Preuves
- Tests : ok (374 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : docs/screenshots/gestionnaire-de-scenarios/enregistrer-clair.png, docs/screenshots/gestionnaire-de-scenarios/enregistrer-sombre.png, docs/screenshots/gestionnaire-de-scenarios/appliquer-clair.png, docs/screenshots/gestionnaire-de-scenarios/appliquer-sombre.png
<!-- boucle-proof {"tests":{"ok":true,"count":374,"scope":"related"},"tsc":{"ok":true}} -->
