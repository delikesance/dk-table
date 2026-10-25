# Rapport : Modèle de plan (outline) : niveaux de lignes et état replié
Visible : non

## Fait
- Module pur `src/engine/outline.ts` : niveaux 0 à 3 par ligne, `collapse` / `expand` (état = sous-totaux repliés), `hiddenRows`, `showLevel(n)`.
- Tests d'abord `src/engine/outline.test.ts` (rouge avant implémentation).
- Documentation `docs/plan-outline.md`.
- 4e tournée : limite levée, `showLevel` avec niveaux mélangés ne masque plus une ligne peu profonde (test rouge d'abord).

## Non fait
- Pas d'UI (gouttière, boutons de niveaux): carte « UI du plan repliable ».
- Pas de câblage dans la feuille ni dans le `.dktable`: l'état sera rattaché à la feuille avec l'UI.
- Pas de sous-totaux automatiques: carte « Moteur de sous-totaux ».

## Captures
- Sans objet : aucun effet visible (modèle pur).

## Decisions
- Chemin `src/engine/outline.ts` au lieu de `src/model/` (dossier inexistant ; le moteur pur vit dans `src/engine/`).
- Designs `docs/design/2026-10-25-200330.html` (what-if) et `2026-10-25-204816.html` (valeur cible) hors sujet : ignorés.
- Index de ligne 0-based ; niveau 0 jamais masquée, niveau 3 = détail le plus profond.
- Groupe = lignes contiguës au-dessus du sous-total, de niveau strictement supérieur. Replier masque ce groupe.
- Limite : un groupe sans ligne de sous-total en dessous (fin de feuille) ne peut pas être replié.
- 4e tournée : état replié = plis `{row, depth}` (comme Excel : groupe de profondeur d = suite de lignes de niveau ≥ d au-dessus du sous-total). Repli manuel : d = niveau du sous-total + 1. `showLevel(n)` : plis de profondeur n+1, donc seules les lignes de niveau > n sont masquées.
