# Rapport : Moteur de sous-totaux et total général par groupes (3 niveaux)
Statut : en-cours
Visible : non

## Fait
- `src/engine/aggregate.ts` : accumulateur et agrégats SUM, COUNT, AVERAGE, MIN, MAX (texte et vides ignorés).
- `src/engine/subtotals.ts` : `subtotals(rows, { groups, values, fn })`, tri par groupes, sous-total par niveau (1 à 3), total général.
- Reprise : clé vide libellée « Total (vide) », `MAX_LEVELS` = 3 (au-delà : `RangeError`), sans groupe = total seul.
- `src/engine/subtotals.test.ts` : 11 tests (un niveau, trois niveaux, agrégats, plage vide, un groupe, clé vide/lignes courtes, sans groupe, > 3 niveaux, plusieurs colonnes), écrits avant le code.
- `docs/sous-totaux.md` : usage et comportement.

## Non fait
- Interface (Données > Sous-totaux), plan repliable, lignes masquées : hors de cette carte, à reprendre avec « Sous-totaux avec plan repliable ».

## Captures
Aucune (moteur pur, sans effet visible).

## Decisions
- Le design `docs/design/2026-10-25-204816.html` (valeur cible, évaluation pas à pas) ne concerne pas les sous-totaux : non réutilisé.
- Tests dans `src/engine/` (convention du dépôt), pas dans `tests/`.
- Tri interne par colonnes de groupe : l'entrée peut être non triée.
- Libellé de sous-total « Total <valeur> » dans la colonne du niveau ; total général en colonne 0.
- Total général = agrégat direct de toutes les lignes (exact pour AVERAGE, MIN, MAX).
- COUNT compte les nombres (comme Excel COUNT), pas les cellules non vides.
- AVERAGE/MIN/MAX sans nombre : `""` (pas d'erreur).
- Clé vide : « Total (vide) » plutôt que « Total » nu (lisible, distinct du total général).
- Plus de 3 niveaux : erreur explicite (`RangeError`) plutôt que troncature silencieuse.

## Preuves
- Tests : ok (11 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"count":11,"scope":"related"},"tsc":{"ok":true}} -->
