# Rapport : Sélection de la colonne date et utilitaires de plage de dates partagés
Statut : en-cours
Visible : non

## Fait
- `src/engine/dateRange.ts` (pur): `parseDate` (ISO et JJ/MM/AAAA, date calendaire valide), `dateColumns(table)` (colonnes date, en-tête ignoré), `dateRange(values)` (min/max ISO, vides et invalides ignorés), `daysOfMonth(year, month)`.
- Tests `src/engine/dateRange.test.ts` (écrits en premier, rouges puis verts).

## Non fait
- Rien dans les critères de la carte. Pas d'interface: la carte est un utilitaire partagé pour les vues calendrier et chronologie.

## Captures

## Decisions
- Design `docs/design/2026-10-25-220125.html` lu : il traite Espion / Analyse rapide / Appareil photo, sans rapport avec les colonnes date. Pas de construction dessus.
- Emplacement : `src/engine/dateRange.ts` (`src/lib/` n'existe pas dans le dépôt, la convention est `src/engine/`).
- Parsing : ISO `AAAA-MM-JJ` et `JJ/MM/AAAA`, date calendaire valide obligatoire (même règle que `engine/series-date.ts`, qui garde son parseur privé).
- Colonne date : au moins une valeur date valide et plus de la moitié des valeurs non vides sont des dates.
- Pas de capture: `Visible : non`, aucune UI ajoutée.

## Preuves
- Tests : ok (non executes : documentation seule)
- Typecheck : ok
- Captures : sans objet
<!-- boucle-proof {"tests":{"ok":true,"scope":"none"},"tsc":{"ok":true}} -->
