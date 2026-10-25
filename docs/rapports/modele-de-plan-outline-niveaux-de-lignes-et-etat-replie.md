# Rapport : Modèle de plan (outline) : niveaux de lignes et état replié
Statut : en-cours
Visible : non

## Fait
- Module pur `src/engine/outline.ts` : niveaux 0 à 3 par ligne, `collapse` / `expand` (état = sous-totaux repliés), `hiddenRows`, `showLevel(n)`.
- Tests d'abord `src/engine/outline.test.ts` (rouge avant implémentation, puis 7 tests verts).
- Documentation `docs/plan-outline.md`.

## Non fait
- Pas d'UI (gouttière, boutons de niveaux): carte « UI du plan repliable ».
- Pas de câblage dans la feuille ni dans le `.dktable`: l'état sera rattaché à la feuille avec l'UI.
- Pas de sous-totaux automatiques: carte « Moteur de sous-totaux ».
- Limite connue : `showLevel` avec niveaux mélangés peut masquer une ligne peu profonde prise dans une suite plus profonde (documenté).

## Captures
- Sans objet : aucun effet visible (modèle pur).

## Decisions
- Chemin `src/engine/outline.ts` au lieu de `src/model/` (dossier inexistant ; le moteur pur vit dans `src/engine/`).
- Design `docs/design/2026-10-25-200330.html` ignoré : il traite de l'analyse what-if, pas du plan (même décision que la carte listes personnalisées).
- Visible : non, car le modèle seul ne change rien à l'écran.
- Index de ligne 0-based ; niveau 0 jamais masquée, niveau 3 = détail le plus profond.
- Groupe = lignes contiguës au-dessus du sous-total, de niveau strictement supérieur. Replier masque ce groupe.
- `showLevel(n)` remplace l'état : replie chaque ligne de niveau ≤ n dont la ligne du dessus est plus profonde que n.
- Limite : un groupe sans ligne de sous-total en dessous (fin de feuille) ne peut pas être replié.
- Tournée suivante : le design `docs/design/2026-10-25-200330.html` ne parle que d'analyse what-if (aucune mention de plan ni de sous-total) : ignoré, comme au premier passage.
- Tournée suivante : critères d'acceptation relus, tous couverts par les 7 tests existants (niveaux 0-3, repli, dépli sans sous-groupes, `showLevel`). Aucun changement de code.
- Tournée suivante (3e) : `docs/design/2026-10-25-204816.html` est « Valeur cible et évaluation pas à pas » (hors plan, ignoré). Relecture : `npx vitest run src/engine/outline.test.ts` = 7 verts. Aucun changement de code; `docs/plan-outline.md` (26 lignes) vérifié.

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
