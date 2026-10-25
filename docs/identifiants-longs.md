# Identifiants longs intacts

**Quoi** : une saisie numérique (entier ou décimal sans exposant) de plus de 15 chiffres significatifs (signe et zéros de tête ignorés) est stockée en texte exact, comme avec le préfixe `'`.

**Pourquoi** : un nombre double perd les chiffres au-delà du 15e (Excel les met à zéro). IDs, IBAN numériques, codes restent exacts.

**Usage** : taper, coller, importer un CSV ou ouvrir un `.dktable` ; tout passe par `setCell`. La cellule reçoit la classe `dkg-long` (soulignement bleu) et l'infobulle « Identifiant long : stocké en texte exact (>15 chiffres) ». Une formule qui lit la cellule reçoit le texte exact.

**Code** : `engine/longnum.ts` (`isLongNumber`, `LONG_HINT`), `engine/recalc.ts` `literal`, `engine/audit-kinds.ts` (`rawKind` = `"long"`), `ui/grid/cellkind.ts` (`markKind`), `ui/grid/grid.css`.

**Limites** : ≤ 15 chiffres inchangé (nombre, mode décimal inclus). Les formes à exposant restent des nombres. Arithmétique sur la cellule (`=A1+1`) : coercition numérique habituelle du texte numérique.
