# Rapport : Moteur de sous-totaux et total général par groupes (3 niveaux)
Visible : non

## Fait
- `src/engine/aggregate.ts` : accumulateur et agrégats SUM, COUNT, AVERAGE, MIN, MAX (texte et vides ignorés).
- `src/engine/subtotals.ts` : `subtotals(rows, { groups, values, fn })`, tri par groupes, sous-total par niveau (1 à 3), total général.
- `src/engine/subtotals.test.ts` : 9 tests (un niveau, trois niveaux, agrégats, plage vide, un groupe, plusieurs colonnes), écrits avant le code (rouge puis vert).
- `docs/sous-totaux.md` : usage et comportement.

## Non fait
- Interface (Données > Sous-totaux), plan repliable, lignes masquées : hors de cette carte, à reprendre avec « Sous-totaux avec plan repliable ».

## Captures
Aucune (moteur pur, sans effet visible).

## Decisions
- Le design `docs/design/2026-10-25-200330.html` traite de l'analyse what-if, sans rapport avec les sous-totaux : non réutilisé (avis `trancheur`).
- Tests dans `src/engine/` (convention du dépôt), pas dans `tests/`.
- Tri interne par colonnes de groupe : l'entrée peut être non triée.
- Libellé de sous-total « Total <valeur> » dans la colonne du niveau ; total général en colonne 0.
- Total général = agrégat direct de toutes les lignes (exact pour AVERAGE, MIN, MAX).
- COUNT compte les nombres (comme Excel COUNT), pas les cellules non vides.
- AVERAGE/MIN/MAX sans nombre : `""` (pas d'erreur).
