# Rapport : Évaluation partielle d'une sous-expression de l'AST
Visible : non

## Fait
- TDD : `src/engine/partialEval.test.ts` et `src/engine/unparse.test.ts` écrits rouges d'abord, puis implémentation au vert.
- Code : `src/engine/partialEval.ts` (`evalNode`, `findNode`, `evalSelection`) et `src/engine/unparse.ts` (`unparse`, `normText`). Le parseur et l'évaluateur ne sont pas modifiés.
- Doc : `docs/evaluation-partielle.md`.
- Critères couverts par les tests : valeur d'un sous-nœud égale à l'évaluation complète ; références résolues dans la feuille ; plage sélectionnée mappée au nœud `range` ; erreurs propagées comme valeurs intermédiaires.

## Non fait

## Captures
Sans objet : pas d'effet visible (moteur pur, aucune UI câblée).

## Decisions
- Design `docs/design/2026-10-25-220125.html` lu : il traite Espion / Analyse rapide / Appareil photo, pas l'évaluation partielle. Pas de design dédié ; contrat déduit des critères de la carte.
- Mapping texte -> nœud : par reconstitution du texte (unparse) des nœuds, comparée au texte sélectionné sans espaces ni casse. Le parseur n'enregistre pas de positions, donc il n'est pas modifié (parser.ts reste sous 200 lignes).
- Limite connue : la comparaison ignore les espaces, donc des chaînes littérales qui ne diffèrent que par des espaces sont confondues.
- Pas de câblage dans la barre de formule ni dans F9 : hors critères (carte parente « F9 »).
