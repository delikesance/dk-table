# Rapport : Stockage des instantanés de versions nommées (créer, lister)
Visible : non

## Fait
- `src/io/versions.ts` : `createVersion(h, doc, name, t)` (instantané complet via `addSnapshot`, nom rogné, nom vide ou en doublon refusé par `VersionError`) et `listVersions(h)` (plus récente d'abord, égalité d'horodatage départagée par l'ordre d'ajout).
- `src/io/versions.test.ts` : 5 tests (contenu et horodatage, tri, nom vide, doublon et rognage, persistance par aller-retour `serialize`/`parse`).
- Persistance : les versions sont stockées dans `DktDoc.history.snaps`, déjà écrit et relu par `format.ts` / `historyFormat.ts`.

## Non fait

## Captures

## Decisions
- Chemins adaptés : `src/lib/` et `src/store/` n'existent pas dans ce dépôt ; le code vit dans `src/io/` (où se trouve déjà `history.ts`).
- Réutilisation de `addSnapshot` (`src/io/history.ts`) au lieu d'un second format : évite deux structures d'instantanés.
- Doublon comparé à l'égalité stricte après rognage (sensible à la casse). Choix simple, à revoir si l'utilisateur veut « v1 » = « V1 ».
- Pas de restauration ni d'interface : hors de cette carte (cartes « Restauration d'une version » et « Panneau d'historique »). Le panneau existant `ui/dialogs/history.ts` affiche encore les anciens instantanés sans passer par `listVersions` : à brancher avec la carte panneau.
- Aucune UI ajoutée : `Visible : non`, donc pas de captures.
