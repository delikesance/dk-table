# Export FEC

Fichier des Écritures Comptables (art. A47 A-1 du LPF), produit à partir de la feuille active.

## Préparer la feuille

- **Données > Insérer les en-têtes FEC** écrit les 18 colonnes en A1:R1 (refusé si la ligne 1 n'est pas vide ; annulable en un pas).
- Ligne 1 = en-têtes : `JournalCode`, `JournalLib`, `EcritureNum`, `EcritureDate`, `CompteNum`, `CompteLib`, `CompAuxNum`, `CompAuxLib`, `PieceRef`, `PieceDate`, `EcritureLib`, `Debit`, `Credit`, `EcritureLet`, `DateLet`, `ValidDate`, `Montantdevise`, `Idevise`.
- Ordre des colonnes et casse libres ; les colonnes supplémentaires sont ignorées.
- Une ligne par écriture à partir de la ligne 2 ; les lignes vides sont ignorées.

## Exporter

**Fichier > Exporter FEC…** : fichier `.txt`, champs séparés par tabulation, lignes terminées par CRLF, colonnes dans l'ordre légal ci-dessus. Le nom légal est à saisir dans le dialogue (`<SIREN>FEC<AAAAMMJJ>.txt`).

- Dates : `AAAAMMJJ`. Acceptées : date du tableur (numéro de série, ex. `=DATE(2024;1;15)`), `AAAA-MM-JJ`, `JJ/MM/AAAA`, `AAAAMMJJ`.
- Montants : virgule décimale, 2 décimales, sans séparateur de milliers (`1234,50`). Debit/Credit vides : `0,00` ; Montantdevise vide reste vide.
- Textes : tabulations et retours à la ligne remplacés par une espace ; les zéros en tête sont conservés.
- Les formules sont exportées par leur valeur calculée.

## Contrôles

L'export est refusé (un message, le premier problème et le nombre restant) si :

- une des 18 colonnes manque ;
- une ligne n'a pas de `JournalCode`, `EcritureNum` ou `CompteNum` ;
- `EcritureDate` ou `ValidDate` est absente ou invalide (autres dates : invalides seulement si renseignées) ;
- un montant n'est pas un nombre, ou une cellule est en erreur (`#DIV/0!`…) ;
- `Debit` et `Credit` sont tous deux non nuls sur une même ligne ;
- le total débit d'un `EcritureNum` diffère du total crédit (au centime).

## Limites

- Les références vers d'autres feuilles (`Feuille2!A1`) ne sont pas calculées à l'export : la cellule vaut `#REF!` et l'export est refusé.
- Pas de contrôle de la continuité des numéros d'écriture, de l'ordre chronologique ni du plan comptable.
- Encodage UTF-8 (sans BOM).
