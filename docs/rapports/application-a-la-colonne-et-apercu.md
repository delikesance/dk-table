# Rapport : Application à la colonne et aperçu
Statut : bloque
Visible : oui

## Fait

- Carte vérifiée dans le dépôt : aucune implémentation trouvée (`grep` sur `src/`, `e2e/`, `docs/` : aucune occurrence de « flash », « remplissage instantané », `flashFill`, `fillPreview`).
- `TODO.md` ne contient aucune entrée cochée pour cette carte (seule entrée proche : G3 Poignée de recopie, sans rapport avec l'aperçu de motif).
- Seul artefact trouvé : la carte parente est décrite dans `docs/recherche/fonctionnalites.md` (lignes 79-82), commit `6cee4b3`.
- Aucun test existant (`src/engine/flashFill.test.ts` absent).
- Aucun fichier `src/engine/flashFill.ts` ni `src/ui/flashFillPreview.ts`.

## Non fait

- Les quatre critères d'acceptation ne sont pas réalisés :
  - Aperçu grisé après saisie d'exemples.
  - Entrée accepte l'aperçu et écrit les valeurs.
  - Échap rejette l'aperçu sans modifier les données.
  - Lignes sans motif applicable laissées vides.
- Aucun test écrit (TDD non démarré).

## Captures

Aucune. La fonctionnalité n'existe pas dans l'application, il n'y a rien à capturer.

## Decisions

- Le lot annonçait « DEJA IMPLEMENTEE (TODO coché) ». Cette affirmation est fausse dans le dépôt : pas de code, pas de test, pas de case cochée. Je n'ai pas implémenté la fonctionnalité, puisque la consigne était de ne rien recoder pour cette carte. Je n'ai pas non plus inventé de preuves.
- Le design `docs/design/2026-10-25-220125.html` porte sur « Espion, Analyse rapide, Appareil photo » : il ne concerne pas cette carte, il n'a donc pas été utilisé.

## Bloque

- Carte marquée déjà réalisée à tort. Pour la traiter, il faut décider si elle doit être réellement construite (moteur d'inférence de motif + aperçu grisé, TDD) ou si la marque du lot doit être corrigée. Décision utilisateur ou boucle requise.

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
